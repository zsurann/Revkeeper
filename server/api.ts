/// <reference types="@cloudflare/workers-types" />
import { AuthError, verifyIdToken, type Jwk } from './google'
import { sendPush, type PushEnv } from './push'
import { isId, recordError } from './schema'
import { zipStoreStream, type ZipEntry } from './zip'

export type Env = PushEnv & { FILES: R2Bucket; GOOGLE_CLIENT_ID: string }

// Tetti per restare nel piano gratuito (vedi Notes della mappa)
export const LIMITS = {
  pushBatch: 50,
  pullPage: 500,
  recordBytes: 100_000,
  fileBytes: 15 * 1024 * 1024,
  userBytes: 500 * 1024 * 1024,
  sessionDays: 180,
  subsPerUser: 5,
} as const
const KINDS = new Set(['bikes', 'readings', 'items', 'services', 'documents', 'attachments'])
const COOKIE = '__Host-rk'

// Vale per le risposte JSON e per i file: l'app non va messa in un frame, i tipi non si indovinano.
export const SECURITY = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'permissions-policy': 'camera=(self), microphone=(), geolocation=(), payment=(), usb=(), notifications=(self)',
  'content-security-policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
} as const

const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...SECURITY, ...headers } })
const fail = (status: number, error: string) => json({ error }, status)

const sha256 = async (s: string) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('')

const cookie = (req: Request) => /(?:^|;\s*)__Host-rk=([^;]+)/.exec(req.headers.get('cookie') ?? '')?.[1]
const setCookie = (value: string, maxAge: number) => `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`

const userOf = async (req: Request, env: Env) => {
  const token = cookie(req)
  if (!token) return undefined
  const row = await env.DB.prepare('SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?')
    .bind(await sha256(token), Date.now())
    .first<{ user_id: string }>()
  return row?.user_id
}

// CSRF: le scritture accettano solo richieste dalla stessa origine (oltre a SameSite=Lax)
const sameOrigin = (req: Request) => {
  const origin = req.headers.get('origin')
  return origin === null || origin === new URL(req.url).origin
}

type Change = { kind: string; id: string; data: unknown; updatedAt: number; deleted?: boolean }

const login = async (req: Request, env: Env, keys?: () => Promise<Jwk[]>) => {
  const { credential } = (await req.json()) as { credential?: string }
  if (!credential) return fail(400, 'Credenziale mancante')
  const user = await verifyIdToken(credential, env.GOOGLE_CLIENT_ID, keys)
  const token = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, '0')).join('')
  const maxAge = LIMITS.sessionDays * 86400
  await env.DB.batch([
    env.DB.prepare('INSERT INTO users(id, email, created_at) VALUES (?1, ?2, ?3) ON CONFLICT(id) DO UPDATE SET email = ?2')
      .bind(user.sub, user.email, Date.now()),
    env.DB.prepare('INSERT INTO sessions(token_hash, user_id, expires_at) VALUES (?, ?, ?)')
      .bind(await sha256(token), user.sub, Date.now() + maxAge * 1000),
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(Date.now()),
  ])
  return json({ email: user.email }, 200, { 'set-cookie': setCookie(token, maxAge) })
}

const push = async (req: Request, env: Env, userId: string) => {
  const { deviceId, changes } = (await req.json()) as { deviceId?: string; changes?: Change[] }
  if (!isId(deviceId) || !Array.isArray(changes) || changes.length > LIMITS.pushBatch) return fail(400, 'Lotto non valido')
  for (const c of changes) {
    if (!c || typeof c !== 'object' || typeof c.kind !== 'string' || !KINDS.has(c.kind) || !isId(c.id)) return fail(400, 'Record non valido')
    if (typeof c.updatedAt !== 'number' || !Number.isInteger(c.updatedAt) || c.updatedAt < 0 || c.updatedAt > 1e14) return fail(400, 'Record non valido')
    if (c.deleted != null && typeof c.deleted !== 'boolean') return fail(400, 'Record non valido')
    if (!c.deleted && recordError(c.kind, c.data, c.id, c.updatedAt)) return fail(400, 'Record non valido')
    if (JSON.stringify(c.data ?? null).length > LIMITS.recordBytes) return fail(413, 'Record troppo grande')
  }
  if (changes.length === 0) return json({ ok: true })
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET rev = rev + 1 WHERE id = ?').bind(userId),
    ...changes.map((c) =>
      env.DB.prepare(
        `INSERT INTO records(user_id, kind, id, data, updated_at, device_id, deleted, rev)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, (SELECT rev FROM users WHERE id = ?1))
         ON CONFLICT(user_id, kind, id) DO UPDATE SET
           data = excluded.data, updated_at = excluded.updated_at, device_id = excluded.device_id,
           deleted = excluded.deleted, rev = excluded.rev
         WHERE excluded.updated_at > records.updated_at
            OR (excluded.updated_at = records.updated_at AND excluded.device_id > records.device_id)`,
      ).bind(userId, c.kind, c.id, c.deleted ? null : JSON.stringify(c.data), c.updatedAt, deviceId, c.deleted ? 1 : 0),
    ),
  ])
  // Allegato cancellato: libera subito lo spazio su R2 e nella quota
  for (const c of changes.filter((c) => c.kind === 'attachments' && c.deleted)) await dropFile(env, userId, c.id)
  return json({ ok: true })
}

const dropFile = async (env: Env, userId: string, id: string) => {
  const old = await env.DB.prepare('SELECT size FROM files WHERE user_id = ? AND id = ?').bind(userId, id).first<{ size: number }>()
  if (!old) return
  await env.FILES.delete(`${userId}/${id}`)
  await env.DB.batch([
    env.DB.prepare('DELETE FROM files WHERE user_id = ? AND id = ?').bind(userId, id),
    env.DB.prepare('UPDATE users SET bytes = MAX(0, bytes - ?2) WHERE id = ?1').bind(userId, old.size),
  ])
}

// Un lotto di push condivide un solo rev: una pagina piena va chiusa all'ultimo rev completo,
// altrimenti il resto di quel lotto finisce oltre il cursore e non arriva mai (pushBatch < pullPage, quindi la pagina non si svuota)
export const pageOf = <T extends { rev: number }>(rows: T[], limit: number, since: number) => {
  if (rows.length < limit) return { rows, cursor: rows.at(-1)?.rev ?? since, more: false }
  const last = rows.at(-1)!.rev
  const kept = rows.filter((r) => r.rev !== last)
  return { rows: kept, cursor: kept.at(-1)?.rev ?? since, more: true }
}

const parseStored = (raw: string | null, label: string): { ok: true; data: unknown } | { ok: false } => {
  if (raw == null) return { ok: true, data: null }
  try {
    return { ok: true, data: JSON.parse(raw) }
  } catch (e) {
    console.error(label, e)
    return { ok: false }
  }
}

const pull = async (url: URL, env: Env, userId: string) => {
  const since = Number(url.searchParams.get('since') ?? 0)
  const cursorIn = Number.isFinite(since) ? since : 0
  const { results } = await env.DB.prepare(
    'SELECT kind, id, data, updated_at, device_id, deleted, rev FROM records WHERE user_id = ? AND rev > ? ORDER BY rev LIMIT ?',
  )
    .bind(userId, cursorIn, LIMITS.pullPage)
    .all<{ kind: string; id: string; data: string | null; updated_at: number; device_id: string; deleted: number; rev: number }>()
  const page = pageOf(results, LIMITS.pullPage, cursorIn)
  const changes = []
  for (const r of page.rows) {
    const parsed = parseStored(r.data, `Record JSON non valido: ${r.kind}/${r.id}`)
    if (!parsed.ok) continue
    changes.push({ kind: r.kind, id: r.id, data: parsed.data, updatedAt: r.updated_at, deviceId: r.device_id, deleted: !!r.deleted })
  }
  return json({ changes, cursor: page.cursor, more: page.more })
}

type SubBody = { subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }; hour?: number; tz?: string }

const subscribe = async (req: Request, env: Env, userId: string) => {
  const { subscription: s, hour, tz } = (await req.json()) as SubBody
  const endpoint = s?.endpoint ?? ''
  if (!endpoint.startsWith('https://') || !s?.keys?.p256dh || !s.keys.auth) return fail(400, 'Iscrizione non valida')
  if (!Number.isInteger(hour) || hour! < 0 || hour! > 23) return fail(400, 'Ora non valida')
  try {
    new Intl.DateTimeFormat('it', { timeZone: tz })
  } catch {
    return fail(400, 'Fuso orario non valido')
  }
  const n = await env.DB.prepare('SELECT count(*) n FROM push_subs WHERE user_id = ? AND endpoint != ?').bind(userId, endpoint).first<{ n: number }>()
  if ((n?.n ?? 0) >= LIMITS.subsPerUser) return fail(429, 'Troppi dispositivi con notifiche: disattivale su uno')
  await env.DB.batch([
    env.DB.prepare('INSERT INTO push_subs(endpoint, user_id, p256dh, auth) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(endpoint) DO UPDATE SET user_id = ?2, p256dh = ?3, auth = ?4')
      .bind(endpoint, userId, s.keys.p256dh, s.keys.auth),
    env.DB.prepare('UPDATE users SET notify_hour = ?, tz = ? WHERE id = ?').bind(hour, tz, userId),
  ])
  return json({ ok: true })
}

const FILE_ID = /^[0-9a-f-]{36}$/

// Conta i byte veri, e si ferma appena il file supera il tetto (Content-Length si può mentire).
const readLimited = async (req: Request, max: number) => {
  const declared = Number(req.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > max) return undefined
  const reader = req.body?.getReader()
  if (!reader) return new Uint8Array()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value?.byteLength) continue
    total += value.byteLength
    if (total > max) {
      await reader.cancel().catch(() => undefined)
      return undefined
    }
    chunks.push(value)
  }
  const out = new Uint8Array(total)
  let o = 0
  for (const c of chunks) {
    out.set(c, o)
    o += c.byteLength
  }
  return out
}

const mime = (req: Request) => {
  const raw = (req.headers.get('content-type') ?? 'application/octet-stream').split(';', 1)[0]!.trim().toLowerCase()
  return /^[a-z0-9.+-]+\/[a-z0-9.+-]+$/.test(raw) ? raw : 'application/octet-stream'
}

// La quota è un UPDATE condizionale: due upload insieme non superano i 500 MB, D1 li serializza.
const reserve = async (env: Env, userId: string, id: string, size: number) => {
  const row = await env.DB.prepare(
    `UPDATE users
     SET bytes = bytes - COALESCE((SELECT size FROM files WHERE user_id = ?1 AND id = ?2), 0) + ?3
     WHERE id = ?1
       AND bytes - COALESCE((SELECT size FROM files WHERE user_id = ?1 AND id = ?2), 0) + ?3 <= ?4
     RETURNING (SELECT size FROM files WHERE user_id = ?1 AND id = ?2) AS old_size`,
  ).bind(userId, id, size, LIMITS.userBytes).first<{ old_size: number | null }>()
  if (!row) return undefined
  await env.DB.prepare('INSERT INTO files(user_id, id, size) VALUES (?1, ?2, ?3) ON CONFLICT(user_id, id) DO UPDATE SET size = ?3').bind(userId, id, size).run()
  return row
}

const release = async (env: Env, userId: string, id: string, size: number, oldSize: number | null) => {
  if (oldSize == null) {
    const gone = await env.DB.prepare('DELETE FROM files WHERE user_id = ? AND id = ? AND size = ?').bind(userId, id, size).run()
    if (gone.meta.changes) await env.DB.prepare('UPDATE users SET bytes = MAX(0, bytes - ?) WHERE id = ?').bind(size, userId).run()
    await env.FILES.delete(`${userId}/${id}`).catch(() => undefined)
    return
  }
  const restored = await env.DB.prepare('UPDATE files SET size = ?4 WHERE user_id = ?1 AND id = ?2 AND size = ?3').bind(userId, id, size, oldSize).run()
  if (restored.meta.changes) await env.DB.prepare('UPDATE users SET bytes = MAX(0, bytes - ?2 + ?3) WHERE id = ?1').bind(userId, size, oldSize).run()
}

const putFile = async (req: Request, env: Env, userId: string, id: string) => {
  const body = await readLimited(req, LIMITS.fileBytes)
  if (!body) return fail(413, 'File oltre 15 MB')
  if (body.byteLength <= 0) return fail(411, 'Dimensione mancante')
  const held = await reserve(env, userId, id, body.byteLength)
  if (!held) {
    const user = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first()
    return user ? fail(507, 'Spazio online esaurito (500 MB)') : fail(401, 'Non autenticato')
  }
  try {
    await env.FILES.put(`${userId}/${id}`, body, { httpMetadata: { contentType: mime(req) } })
  } catch (e) {
    await release(env, userId, id, body.byteLength, held.old_size)
    throw e
  }
  return json({ ok: true })
}

// Il tipo lo dichiara chi carica: si apre nel browser solo ciò che non può eseguire script
const INLINE = /^(image\/(png|jpeg|gif|webp|avif|heic|heif)|application\/pdf)$/
export const fileHeaders = (type = 'application/octet-stream') => ({
  ...SECURITY,
  'content-type': type,
  'content-disposition': INLINE.test(type) ? 'inline' : 'attachment',
  'x-content-type-options': 'nosniff',
  'cache-control': 'private, max-age=31536000, immutable',
})

const getFile = async (env: Env, userId: string, id: string) => {
  const obj = await env.FILES.get(`${userId}/${id}`)
  if (!obj) return fail(404, 'File non trovato')
  return new Response(obj.body, { headers: fileHeaders(obj.httpMetadata?.contentType) })
}

const listFiles = async (env: Env, userId: string) => {
  const keys: string[] = []
  let cursor: string | undefined
  for (;;) {
    const page = await env.FILES.list({ prefix: `${userId}/`, cursor })
    for (const o of page.objects) keys.push(o.key)
    if (!page.truncated) return keys
    cursor = page.cursor
  }
}

const safeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^\.+/, '').slice(0, 80)

const exportAccount = async (env: Env, userId: string) => {
  const user = await env.DB.prepare('SELECT id, email, created_at, notify_hour, tz, bytes FROM users WHERE id = ?').bind(userId).first<{
    id: string; email: string; created_at: number; notify_hour: number | null; tz: string; bytes: number
  }>()
  if (!user) return fail(401, 'Non autenticato')
  const { results } = await env.DB.prepare(
    'SELECT kind, id, data, updated_at, device_id, deleted FROM records WHERE user_id = ? ORDER BY kind, id',
  ).bind(userId).all<{ kind: string; id: string; data: string | null; updated_at: number; device_id: string; deleted: number }>()
  const { results: subs } = await env.DB.prepare('SELECT endpoint FROM push_subs WHERE user_id = ?').bind(userId).all<{ endpoint: string }>()
  const names = new Map<string, string>()
  const records = results.map((r) => {
    const parsed = parseStored(r.data, `Export, record non leggibile: ${r.kind}/${r.id}`)
    if (parsed.ok && r.kind === 'attachments' && parsed.data && typeof parsed.data === 'object' && 'name' in parsed.data && typeof parsed.data.name === 'string')
      names.set(r.id, parsed.data.name)
    return parsed.ok
      ? { kind: r.kind, id: r.id, data: parsed.data, updatedAt: r.updated_at, deviceId: r.device_id, deleted: !!r.deleted }
      : { kind: r.kind, id: r.id, raw: r.data, updatedAt: r.updated_at, deviceId: r.device_id, deleted: !!r.deleted, unreadable: true }
  })
  const keys = await listFiles(env, userId)
  const files = keys.map((key) => {
    const id = key.slice(userId.length + 1)
    const name = names.get(id)
    const safe = name ? safeName(name) : ''
    return { id, name, path: `files/${id}${safe ? `-${safe}` : ''}` }
  })
  const payload = {
    exportedAt: new Date().toISOString(),
    account: { id: user.id, email: user.email, createdAt: user.created_at, notifyHour: user.notify_hour, tz: user.tz, bytes: user.bytes },
    notifications: subs.map((s) => s.endpoint),
    records,
    files,
  }
  const body = zipStoreStream((async function* (): AsyncGenerator<ZipEntry> {
    yield { name: 'dati.json', data: new TextEncoder().encode(JSON.stringify(payload, null, 2)) }
    for (const file of files) {
      const obj = await env.FILES.get(`${userId}/${file.id}`)
      if (!obj) continue
      yield { name: file.path, data: new Uint8Array(await obj.arrayBuffer()) }
    }
  })())
  return new Response(body, {
    headers: {
      ...SECURITY,
      'content-type': 'application/zip',
      'content-disposition': 'attachment; filename="revkeeper-dati.zip"',
      'cache-control': 'no-store',
    },
  })
}

const deleteStoredFiles = async (env: Env, userId: string) => {
  let cursor: string | undefined
  for (;;) {
    const page = await env.FILES.list({ prefix: `${userId}/`, cursor })
    if (page.objects.length) await env.FILES.delete(page.objects.map((o) => o.key))
    if (!page.truncated) return
    cursor = page.cursor
  }
}

const deleteAccount = async (env: Env, userId: string) => {
  await deleteStoredFiles(env, userId)
  await env.DB.batch([
    env.DB.prepare('DELETE FROM push_subs WHERE user_id = ?').bind(userId),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId),
    env.DB.prepare('DELETE FROM records WHERE user_id = ?').bind(userId),
    env.DB.prepare('DELETE FROM files WHERE user_id = ?').bind(userId),
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId),
  ])
  return json({ ok: true }, 200, { 'set-cookie': setCookie('', 0) })
}

export const handle = async (req: Request, env: Env, keys?: () => Promise<Jwk[]>): Promise<Response> => {
  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/api/, '')
  try {
    if (req.method !== 'GET' && !sameOrigin(req)) return fail(403, 'Origine non ammessa')
    if (req.method === 'POST' && path === '/auth/google') return await login(req, env, keys)

    const userId = await userOf(req, env)
    if (path === '/me' && req.method === 'GET')
      return userId ? json(await env.DB.prepare('SELECT email, bytes FROM users WHERE id = ?').bind(userId).first()) : fail(401, 'Non autenticato')
    if (!userId) return fail(401, 'Non autenticato')

    if (req.method === 'POST' && path === '/auth/logout') {
      await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(cookie(req) ?? '')).run()
      return json({ ok: true }, 200, { 'set-cookie': setCookie('', 0) })
    }
    if (req.method === 'POST' && path === '/auth/logout-all') {
      await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run()
      return json({ ok: true }, 200, { 'set-cookie': setCookie('', 0) })
    }
    if (req.method === 'GET' && path === '/account/export') return await exportAccount(env, userId)
    if (req.method === 'POST' && path === '/account/delete') return await deleteAccount(env, userId)
    if (req.method === 'POST' && path === '/sync/push') return await push(req, env, userId)
    if (req.method === 'POST' && path === '/push/subscribe') return await subscribe(req, env, userId)
    if (req.method === 'POST' && path === '/push/unsubscribe') {
      const { endpoint } = (await req.json()) as { endpoint?: string }
      await env.DB.prepare('DELETE FROM push_subs WHERE endpoint = ? AND user_id = ?').bind(endpoint ?? '', userId).run()
      return json({ ok: true })
    }
    if (req.method === 'POST' && path === '/push/test') {
      const { results } = await env.DB.prepare('SELECT endpoint, p256dh, auth FROM push_subs WHERE user_id = ?').bind(userId).all<{ endpoint: string; p256dh: string; auth: string }>()
      const status = await Promise.all(results.map((sub) => sendPush(env, sub, { title: 'Revkeeper', body: 'Le notifiche funzionano.' })))
      return json({ sent: status.filter((x) => x < 300).length, status })
    }
    if (req.method === 'GET' && path === '/sync/pull') return await pull(url, env, userId)
    const file = /^\/files\/(.+)$/.exec(path)?.[1]
    if (file && FILE_ID.test(file)) {
      if (req.method === 'PUT') return await putFile(req, env, userId, file)
      if (req.method === 'GET') return await getFile(env, userId, file)
    }
    return fail(404, 'Non trovato')
  } catch (e) {
    if (e instanceof AuthError) return fail(401, e.message)
    if (e instanceof SyntaxError) return fail(400, 'JSON non valido')
    console.error(e)
    return fail(500, 'Errore del server')
  }
}
