/// <reference types="@cloudflare/workers-types" />
import { AuthError, verifyIdToken, type Jwk } from './google'
import { sendPush, type PushEnv } from './push'

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

const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })
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
  if (!deviceId || !Array.isArray(changes) || changes.length > LIMITS.pushBatch) return fail(400, 'Lotto non valido')
  for (const c of changes) {
    if (!KINDS.has(c.kind) || typeof c.id !== 'string' || !Number.isFinite(c.updatedAt)) return fail(400, 'Record non valido')
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

const pull = async (url: URL, env: Env, userId: string) => {
  const since = Number(url.searchParams.get('since') ?? 0)
  const { results } = await env.DB.prepare(
    'SELECT kind, id, data, updated_at, device_id, deleted, rev FROM records WHERE user_id = ? AND rev > ? ORDER BY rev LIMIT ?',
  )
    .bind(userId, Number.isFinite(since) ? since : 0, LIMITS.pullPage)
    .all<{ kind: string; id: string; data: string | null; updated_at: number; device_id: string; deleted: number; rev: number }>()
  return json({
    changes: results.map((r) => ({ kind: r.kind, id: r.id, data: r.data && JSON.parse(r.data), updatedAt: r.updated_at, deviceId: r.device_id, deleted: !!r.deleted })),
    cursor: results.at(-1)?.rev ?? since,
    more: results.length === LIMITS.pullPage,
  })
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

const putFile = async (req: Request, env: Env, userId: string, id: string) => {
  const size = Number(req.headers.get('content-length'))
  if (!Number.isFinite(size) || size <= 0) return fail(411, 'Dimensione mancante')
  if (size > LIMITS.fileBytes) return fail(413, 'File oltre 15 MB')
  const user = await env.DB.prepare('SELECT bytes FROM users WHERE id = ?').bind(userId).first<{ bytes: number }>()
  const old = await env.DB.prepare('SELECT size FROM files WHERE user_id = ? AND id = ?').bind(userId, id).first<{ size: number }>()
  if ((user?.bytes ?? 0) - (old?.size ?? 0) + size > LIMITS.userBytes) return fail(507, 'Spazio online esaurito (500 MB)')
  await env.FILES.put(`${userId}/${id}`, req.body, { httpMetadata: { contentType: req.headers.get('content-type') ?? 'application/octet-stream' } })
  await env.DB.batch([
    env.DB.prepare('INSERT INTO files(user_id, id, size) VALUES (?1, ?2, ?3) ON CONFLICT(user_id, id) DO UPDATE SET size = ?3').bind(userId, id, size),
    env.DB.prepare('UPDATE users SET bytes = bytes - ?2 + ?3 WHERE id = ?1').bind(userId, old?.size ?? 0, size),
  ])
  return json({ ok: true })
}

const getFile = async (env: Env, userId: string, id: string) => {
  const obj = await env.FILES.get(`${userId}/${id}`)
  if (!obj) return fail(404, 'File non trovato')
  return new Response(obj.body, { headers: { 'content-type': obj.httpMetadata?.contentType ?? 'application/octet-stream', 'cache-control': 'private, max-age=31536000, immutable' } })
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
