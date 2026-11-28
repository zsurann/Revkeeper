/// <reference types="@cloudflare/workers-types" />
import { AuthError, verifyIdToken, type Jwk } from './google'
import { sendPush, type PushEnv } from './push'
import { hit, ipKey, type RateName } from './ratelimit'
import { cleanRecord, isId, recordError } from './schema'
import { zipStoreStream, type ZipEntry } from './zip'

// ADMIN_EMAILS: email Google (separate da virgola) che vedono le statistiche. Variabile su Cloudflare, non nel repo.
export type Env = PushEnv & { FILES: R2Bucket; GOOGLE_CLIENT_ID: string; ADMIN_EMAILS?: string }

// Tetti per restare nel piano gratuito (vedi Notes della mappa)
export const LIMITS = {
  pushBatch: 50,
  pullPage: 500,
  recordBytes: 20_000, // il record valido più grande (note e liste di allegati al massimo) sta sotto i 13 kB
  fileBytes: 15 * 1024 * 1024,
  userBytes: 500 * 1024 * 1024,
  sessionDays: 180,
  renewDays: 30, // la sessione si rinnova (di nuovo 180 giorni) al massimo una volta ogni 30 giorni d'uso
  subsPerUser: 5,
  guestRecords: 500, // l'ospite serve solo ai promemoria: qualche moto con lo storico
  userRecords: 20_000,
} as const
const KINDS = new Set(['bikes', 'readings', 'items', 'services', 'documents', 'attachments'])
const COOKIE = '__Host-rk'

// Vale per le risposte JSON e per i file: l'app non va messa in un frame, i tipi non si indovinano.
export const SECURITY = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'permissions-policy': 'camera=(self), microphone=(), geolocation=(), payment=(), usb=()',
  'content-security-policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
} as const

const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...SECURITY, ...headers } })
const fail = (status: number, error: string) => json({ error }, status)

const sha256 = async (s: string) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('')

const cookie = (req: Request) => /(?:^|;\s*)__Host-rk=([^;]+)/.exec(req.headers.get('cookie') ?? '')?.[1]
const setCookie = (value: string, maxAge: number) => `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`

const userOf = async (req: Request, env: Env) => (await sessionOf(req, env))?.userId

// Sessione scorrevole: chi usa l'app non resta mai fuori. Una scrittura al massimo ogni renewDays.
const sessionOf = async (req: Request, env: Env) => {
  const token = cookie(req)
  if (!token) return undefined
  const hash = await sha256(token)
  const now = Date.now()
  const row = await env.DB.prepare('SELECT s.user_id, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?')
    .bind(hash, now)
    .first<{ user_id: string; expires_at: number }>()
  if (!row) return undefined
  const maxAge = LIMITS.sessionDays * 86400
  if (row.expires_at > now + (LIMITS.sessionDays - LIMITS.renewDays) * 86_400_000) return { userId: row.user_id }
  await env.DB.prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?').bind(now + maxAge * 1000, hash).run()
  return { userId: row.user_id, renew: setCookie(token, maxAge) }
}

// Corpo JSON come oggetto: null, numeri o array diventano {} (e i campi mancanti danno 400, non 500)
const body = async (req: Request) => {
  const b: unknown = await req.json()
  return (b && typeof b === 'object' && !Array.isArray(b) ? b : {}) as Record<string, unknown>
}

// CSRF: le scritture accettano solo richieste dalla stessa origine (oltre a SameSite=Lax)
const sameOrigin = (req: Request) => {
  const origin = req.headers.get('origin')
  return origin === null || origin === new URL(req.url).origin
}

type Change = { kind: string; id: string; data: unknown; updatedAt: number; deleted?: boolean }

// Troppe richieste: 429 con Retry-After. L'IP serve solo come chiave e si salva come hash.
const limited = async (env: Env, name: RateName, who: string) => {
  const r = await hit(env.DB, name, who)
  return r.ok ? undefined : json({ error: 'Troppe richieste: riprova tra qualche minuto' }, 429, { 'retry-after': String(r.retryAfter) })
}

const login = async (req: Request, env: Env, keys?: () => Promise<Jwk[]>) => {
  const ip = req.headers.get('cf-connecting-ip') ?? 'sconosciuto'
  const stop = await limited(env, 'login', await sha256(`ip:${ipKey(ip)}`))
  if (stop) return stop
  const { credential } = await body(req)
  if (typeof credential !== 'string' || !credential) return fail(400, 'Credenziale mancante')
  const user = await verifyIdToken(credential, env.GOOGLE_CLIENT_ID, keys)
  const guest = await userOf(req, env)
  const { token, maxAge } = await newSession(env, user.sub, [
    env.DB.prepare('INSERT INTO users(id, email, created_at) VALUES (?1, ?2, ?3) ON CONFLICT(id) DO UPDATE SET email = ?2')
      .bind(user.sub, user.email, Date.now()),
  ])
  // Dall'ospite all'account Google: le notifiche passano all'account (con l'ora scelta), il resto lo reinvia il telefono
  if (guest?.startsWith(GUEST)) {
    await env.DB.batch([
      env.DB.prepare('UPDATE push_subs SET user_id = ?1 WHERE user_id = ?2').bind(user.sub, guest),
      env.DB.prepare('UPDATE users SET notify_hour = (SELECT notify_hour FROM users WHERE id = ?2), tz = (SELECT tz FROM users WHERE id = ?2) WHERE id = ?1 AND notify_hour IS NULL')
        .bind(user.sub, guest),
    ])
    await deleteAccount(env, guest)
  }
  return json({ email: user.email }, 200, { 'set-cookie': setCookie(token, maxAge) })
}

const newSession = async (env: Env, userId: string, before: D1PreparedStatement[]) => {
  const token = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, '0')).join('')
  const maxAge = LIMITS.sessionDays * 86400
  await env.DB.batch([
    ...before,
    env.DB.prepare('INSERT INTO sessions(token_hash, user_id, expires_at) VALUES (?, ?, ?)')
      .bind(await sha256(token), userId, Date.now() + maxAge * 1000),
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(Date.now()),
  ])
  return { token, maxAge }
}

// Ospiti senza più una sessione valida (il telefono ne ha già creato uno nuovo): via dati, file e notifiche,
// che altrimenti manderebbero promemoria doppi. Pochi per volta, sfruttando le nuove iscrizioni.
const dropStaleGuests = async (env: Env) => {
  const { results } = await env.DB.prepare(
    `SELECT id FROM users u WHERE id LIKE 'guest-%' AND created_at < ?1
       AND NOT EXISTS (SELECT 1 FROM sessions s WHERE s.user_id = u.id AND s.expires_at > ?2) LIMIT 3`,
  ).bind(Date.now() - 7 * 86_400_000, Date.now()).all<{ id: string }>()
  for (const g of results) await deleteAccount(env, g.id)
}

// Ospite: account anonimo legato al telefono, serve solo perché il server possa calcolare e inviare i promemoria
const GUEST = 'guest-'
const guestLogin = async (req: Request, env: Env) => {
  const ip = req.headers.get('cf-connecting-ip') ?? 'sconosciuto'
  const stop = await limited(env, 'login', await sha256(`ip:${ipKey(ip)}`))
  if (stop) return stop
  const closed = await env.DB.prepare("SELECT value FROM flags WHERE name = 'guests_closed'").first<{ value: number }>()
  if (closed?.value) return fail(503, 'Iscrizioni momentaneamente chiuse: accedi con Google o riprova più tardi')
  await dropStaleGuests(env)
  const id = GUEST + crypto.randomUUID()
  const { token, maxAge } = await newSession(env, id, [
    env.DB.prepare("INSERT INTO users(id, email, created_at) VALUES (?, '', ?)").bind(id, Date.now()),
  ])
  return json({ guest: true }, 200, { 'set-cookie': setCookie(token, maxAge) })
}

const push = async (req: Request, env: Env, userId: string) => {
  const { deviceId, changes } = (await body(req)) as { deviceId?: string; changes?: Change[] }
  if (!isId(deviceId) || !Array.isArray(changes) || changes.length > LIMITS.pushBatch) return fail(400, 'Lotto non valido')
  for (const c of changes) {
    if (!c || typeof c !== 'object' || typeof c.kind !== 'string' || !KINDS.has(c.kind) || !isId(c.id)) return fail(400, 'Record non valido')
    if (typeof c.updatedAt !== 'number' || !Number.isInteger(c.updatedAt) || c.updatedAt < 0 || c.updatedAt > 1e14) return fail(400, 'Record non valido')
    if (c.deleted != null && typeof c.deleted !== 'boolean') return fail(400, 'Record non valido')
    if (!c.deleted && recordError(c.kind, c.data, c.id, c.updatedAt)) return fail(400, 'Record non valido')
    if (JSON.stringify(c.data ?? null).length > LIMITS.recordBytes) return fail(413, 'Record troppo grande')
  }
  if (changes.length === 0) return json({ ok: true })

  // Tetto di record: contano le righe nuove (un id già sul server non occupa altro spazio)
  const byKind = new Map<string, string[]>()
  for (const c of changes) byKind.set(c.kind, [...(byKind.get(c.kind) ?? []), c.id])
  const existing = new Set<string>()
  for (const [kind, ids] of byKind) {
    const { results } = await env.DB.prepare(`SELECT id FROM records WHERE user_id = ?1 AND kind = ?2 AND id IN (${ids.map((_, i) => `?${i + 3}`).join(', ')})`)
      .bind(userId, kind, ...ids).all<{ id: string }>()
    for (const r of results) existing.add(`${kind}/${r.id}`)
  }
  const fresh = new Set(changes.map((c) => `${c.kind}/${c.id}`).filter((k) => !existing.has(k))).size
  const cap = userId.startsWith(GUEST) ? LIMITS.guestRecords : LIMITS.userRecords
  // shortcut: due push insieme possono superare il tetto di un lotto (50 righe), accettabile
  const user = await env.DB.prepare('SELECT records FROM users WHERE id = ?').bind(userId).first<{ records: number }>()
  if (fresh && (user?.records ?? 0) + fresh > cap) return fail(413, `Limite di ${cap} record raggiunto${userId.startsWith(GUEST) ? ': accedi con Google per salvarne di più' : ''}`)

  await env.DB.batch([
    env.DB.prepare('UPDATE users SET rev = rev + 1, records = records + ?2 WHERE id = ?1').bind(userId, fresh),
    ...changes.map((c) =>
      env.DB.prepare(
        `INSERT INTO records(user_id, kind, id, data, updated_at, device_id, deleted, rev)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, (SELECT rev FROM users WHERE id = ?1))
         ON CONFLICT(user_id, kind, id) DO UPDATE SET
           data = excluded.data, updated_at = excluded.updated_at, device_id = excluded.device_id,
           deleted = excluded.deleted, rev = excluded.rev
         WHERE excluded.updated_at > records.updated_at
            OR (excluded.updated_at = records.updated_at AND excluded.device_id > records.device_id)`,
      ).bind(userId, c.kind, c.id, c.deleted ? null : JSON.stringify(cleanRecord(c.kind, c.data as Record<string, unknown>)), c.updatedAt, deviceId, c.deleted ? 1 : 0),
    ),
  ])
  // Allegati cancellati: libera subito R2 e la quota. Solo se la cancellazione ha vinto (un tombstone più vecchio
  // della copia sul server non tocca il file). Una query e un batch per tutto il lotto: restano nel limite di 50 query.
  const gone = changes.filter((c) => c.kind === 'attachments' && c.deleted).map((c) => c.id)
  if (gone.length) {
    const { results: files } = await env.DB.prepare(
      `SELECT f.id, f.size FROM files f JOIN records r ON r.user_id = f.user_id AND r.kind = 'attachments' AND r.id = f.id
       WHERE f.user_id = ?1 AND r.deleted = 1 AND f.id IN (${gone.map((_, i) => `?${i + 2}`).join(', ')})`,
    ).bind(userId, ...gone).all<{ id: string; size: number }>()
    if (files.length) {
      await env.FILES.delete(files.map((f) => `${userId}/${f.id}`))
      await env.DB.batch([
        env.DB.prepare(`DELETE FROM files WHERE user_id = ?1 AND id IN (${files.map((_, i) => `?${i + 2}`).join(', ')})`).bind(userId, ...files.map((f) => f.id)),
        env.DB.prepare('UPDATE users SET bytes = MAX(0, bytes - ?2) WHERE id = ?1').bind(userId, files.reduce((n, f) => n + f.size, 0)),
      ])
    }
  }
  return json({ ok: true })
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
  // Ultimo accesso per la cancellazione degli account inattivi: al massimo una scrittura al giorno
  const now = Date.now()
  await env.DB.prepare('UPDATE users SET seen_at = ?1, warned_at = NULL WHERE id = ?2 AND (seen_at IS NULL OR seen_at < ?1 - 86400000)').bind(now, userId).run()
  const since = Number(url.searchParams.get('since') ?? 0)
  const cursorIn = Number.isFinite(since) ? since : 0
  const { results } = await env.DB.prepare(
    'SELECT kind, id, data, updated_at, device_id, deleted, rev FROM records WHERE user_id = ? AND rev > ? ORDER BY rev LIMIT ?',
  )
    .bind(userId, cursorIn, LIMITS.pullPage)
    .all<{ kind: string; id: string; data: string | null; updated_at: number; device_id: string; deleted: number; rev: number }>()
  let page = pageOf(results, LIMITS.pullPage, cursorIn)
  // Dati vecchi con più di una pagina sullo stesso rev (cancellazioni di moto prima del 28/11/2026): quel rev arriva intero
  if (page.more && page.rows.length === 0) {
    const last = results.at(-1)!.rev
    const { results: same } = await env.DB.prepare('SELECT kind, id, data, updated_at, device_id, deleted, rev FROM records WHERE user_id = ? AND rev = ?')
      .bind(userId, last).all<(typeof results)[number]>()
    page = { rows: same, cursor: last, more: true }
  }
  // Cursore oltre il rev del server (database ripristinato): il telefono riparte da zero, i suoi dati più recenti restano
  if (results.length === 0 && cursorIn > 0) {
    const u = await env.DB.prepare('SELECT rev FROM users WHERE id = ?').bind(userId).first<{ rev: number }>()
    if (u && cursorIn > u.rev) return json({ changes: [], cursor: 0, more: true })
  }
  const changes = []
  for (const r of page.rows) {
    const parsed = parseStored(r.data, `Record JSON non valido: ${r.kind}/${r.id}`)
    if (!parsed.ok) continue
    changes.push({ kind: r.kind, id: r.id, data: parsed.data, updatedAt: r.updated_at, deviceId: r.device_id, deleted: !!r.deleted })
  }
  return json({ changes, cursor: page.cursor, more: page.more })
}

// Solo i servizi di notifica dei browser: il server non deve contattare indirizzi scelti da chi si iscrive
export const PUSH_HOST = /^https:\/\/(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+(\.[a-z0-9-]+)*\.push\.apple\.com|[a-z0-9-]+(\.[a-z0-9-]+)*\.notify\.windows\.com)\//

type SubBody = { subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }; hour?: number; tz?: string }

const subscribe = async (req: Request, env: Env, userId: string) => {
  const { subscription: s, hour, tz } = (await body(req)) as SubBody
  const endpoint = s?.endpoint ?? ''
  if (!PUSH_HOST.test(endpoint) || !s?.keys?.p256dh || !s.keys.auth) return fail(400, 'Iscrizione non valida')
  if (!Number.isInteger(hour) || hour! < 0 || hour! > 23) return fail(400, 'Ora non valida')
  if (typeof tz !== 'string' || !tz || tz.length > 64) return fail(400, 'Fuso orario non valido')
  try {
    new Intl.DateTimeFormat('it', { timeZone: tz })
  } catch {
    return fail(400, 'Fuso orario non valido')
  }
  const n = await env.DB.prepare('SELECT count(*) n FROM push_subs WHERE user_id = ? AND endpoint != ?').bind(userId, endpoint).first<{ n: number }>()
  if ((n?.n ?? 0) >= LIMITS.subsPerUser) return fail(429, 'Troppi dispositivi con notifiche: disattivale su uno')
  await env.DB.batch([
    // Un telefono già legato a un altro account Google non si sposta da qui: ci si arriva solo uscendo da quello
    env.DB.prepare(
      `INSERT INTO push_subs(endpoint, user_id, p256dh, auth) VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT(endpoint) DO UPDATE SET user_id = ?2, p256dh = ?3, auth = ?4 WHERE push_subs.user_id = ?2 OR push_subs.user_id LIKE 'guest-%'`,
    ).bind(endpoint, userId, s.keys.p256dh, s.keys.auth),
    // remind_at azzerato: il cron lo ricalcola con l'ora nuova (e recupera quella di oggi se è appena passata)
    env.DB.prepare('UPDATE users SET notify_hour = ?, tz = ?, remind_at = NULL WHERE id = ?').bind(hour, tz, userId),
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

// La quota è un UPDATE condizionale più l'INSERT del file nello stesso batch (una transazione): con due PUT insieme
// sullo stesso file la seconda vede la taglia già aggiornata, quindi users.bytes non scende e il tetto regge.
const reserve = async (env: Env, userId: string, id: string, size: number) => {
  const prev = await env.DB.prepare('SELECT size FROM files WHERE user_id = ?1 AND id = ?2').bind(userId, id).first<{ size: number }>()
  const old = prev?.size ?? null
  const [upd] = await env.DB.batch([
    env.DB.prepare(
      `UPDATE users SET bytes = bytes - ?3 + ?4
       WHERE id = ?1 AND bytes - ?3 + ?4 <= ?5
         AND COALESCE((SELECT size FROM files WHERE user_id = ?1 AND id = ?2), -1) = ?6`,
    ).bind(userId, id, old ?? 0, size, LIMITS.userBytes, old ?? -1),
    env.DB.prepare('INSERT INTO files(user_id, id, size) SELECT ?1, ?2, ?3 WHERE changes() = 1 ON CONFLICT(user_id, id) DO UPDATE SET size = ?3')
      .bind(userId, id, size),
  ])
  return upd?.meta.changes ? { old_size: old } : undefined
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
  // Gli allegati degli ospiti restano sul telefono: ai promemoria non servono (decisione del 28/11/2026)
  if (userId.startsWith(GUEST)) return fail(403, 'Accedi con Google per salvare gli allegati online')
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

type Store = Pick<Env, 'DB' | 'FILES'>
const deleteStoredFiles = async (env: Store, userId: string) => {
  let cursor: string | undefined
  for (;;) {
    const page = await env.FILES.list({ prefix: `${userId}/`, cursor })
    if (page.objects.length) await env.FILES.delete(page.objects.map((o) => o.key))
    if (!page.truncated) return
    cursor = page.cursor
  }
}

export const deleteAccount = async (env: Store, userId: string) => {
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

const chunk = <T>(xs: T[], size: number) => {
  const out: T[][] = []
  for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size))
  return out
}

const deleteBike = async (env: Env, userId: string, bikeId: string) => {
  const bikeRow = await env.DB.prepare("SELECT id, deleted FROM records WHERE user_id = ? AND kind = 'bikes' AND id = ?")
    .bind(userId, bikeId)
    .first<{ id: string; deleted: number }>()
  if (!bikeRow) return fail(404, 'Moto non trovata')

  const { results } = await env.DB.prepare(
    "SELECT kind, id, data FROM records WHERE user_id = ? AND deleted = 0 AND kind IN ('bikes','readings','items','services','documents','attachments')",
  )
    .bind(userId)
    .all<{ kind: string; id: string; data: string | null }>()

  const byKind = new Map<string, string[]>()
  const addId = (kind: string, id: string) => {
    const list = byKind.get(kind) ?? []
    list.push(id)
    byKind.set(kind, list)
  }
  const bikeAtts = new Set<string>()
  const otherAtts = new Set<string>()
  const aliveAtts = new Set<string>()

  const collectAtts = (kind: string, data: Record<string, unknown>, target: Set<string>) => {
    if (kind === 'bikes' && typeof data.photoId === 'string') target.add(data.photoId)
    if ((kind === 'services' || kind === 'documents') && Array.isArray(data.attachmentIds)) {
      for (const id of data.attachmentIds) if (typeof id === 'string') target.add(id)
    }
  }

  for (const r of results) {
    if (r.kind === 'attachments') {
      aliveAtts.add(r.id)
      continue
    }
    const parsed = parseStored(r.data, `Delete bike, record non leggibile: ${r.kind}/${r.id}`)
    const data = parsed.ok && parsed.data && typeof parsed.data === 'object' ? (parsed.data as Record<string, unknown>) : undefined
    if (r.kind === 'bikes') {
      if (r.id === bikeId) {
        addId('bikes', r.id)
        if (data) collectAtts('bikes', data, bikeAtts)
      } else if (data) {
        collectAtts('bikes', data, otherAtts)
      }
      continue
    }
    if (!data) continue
    if (data.bikeId === bikeId) {
      addId(r.kind, r.id)
      collectAtts(r.kind, data, bikeAtts)
    } else {
      collectAtts(r.kind, data, otherAtts)
    }
  }

  const orphanAtts = [...bikeAtts].filter((id) => !otherAtts.has(id))
  for (const attId of orphanAtts) if (aliveAtts.has(attId)) addId('attachments', attId)

  const orphanSet = new Set(orphanAtts)
  const { results: userFiles } = orphanAtts.length
    ? await env.DB.prepare('SELECT id, size FROM files WHERE user_id = ?').bind(userId).all<{ id: string; size: number }>()
    : { results: [] as { id: string; size: number }[] }
  const filesToDelete = userFiles.filter((f) => orphanSet.has(f.id))
  const freedBytes = filesToDelete.reduce((sum, f) => sum + f.size, 0)

  if (orphanAtts.length) {
    for (const part of chunk(orphanAtts.map((id) => `${userId}/${id}`), 500)) {
      await env.FILES.delete(part)
    }
  }

  const deletedRecords = [...byKind.values()].reduce((sum, ids) => sum + ids.length, 0)
  if (deletedRecords === 0 && filesToDelete.length === 0) {
    return json({ ok: true, deletedRecords: 0, deletedFiles: 0 })
  }

  const now = Date.now()
  const stmts: D1PreparedStatement[] = [
    env.DB.prepare('UPDATE users SET rev = rev + 1, bytes = MAX(0, bytes - ?2) WHERE id = ?1').bind(userId, freedBytes),
  ]
  for (const [kind, ids] of byKind) {
    for (const part of chunk(ids, 50)) {
      const ph = part.map((_, i) => `?${i + 4}`).join(', ')
      // Un rev per blocco: con un solo rev per tutta la moto, oltre 500 righe il pull restava fermo sulla stessa pagina
      if (stmts.length > 1) stmts.push(env.DB.prepare('UPDATE users SET rev = rev + 1 WHERE id = ?').bind(userId))
      stmts.push(
        env.DB.prepare(
          `UPDATE records SET data = NULL, deleted = 1, updated_at = MAX(updated_at + 1, ?1), device_id = '~', rev = (SELECT rev FROM users WHERE id = ?2) WHERE user_id = ?2 AND kind = ?3 AND id IN (${ph})`,
        ).bind(now, userId, kind, ...part),
      )
    }
  }
  for (const part of chunk(filesToDelete.map((f) => f.id), 50)) {
    const ph = part.map((_, i) => `?${i + 2}`).join(', ')
    stmts.push(env.DB.prepare(`DELETE FROM files WHERE user_id = ?1 AND id IN (${ph})`).bind(userId, ...part))
  }
  await env.DB.batch(stmts)
  return json({ ok: true, deletedRecords, deletedFiles: filesToDelete.length })
}

// Statistiche riservate: solo conteggi aggregati, mai email, targhe o contenuti
const isAdmin = async (env: Env, userId: string) => {
  const admins = (env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  if (!admins.length || userId.startsWith(GUEST)) return false
  const row = await env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(userId).first<{ email: string }>()
  return !!row && admins.includes(row.email.toLowerCase())
}

const WEEK = 7 * 86_400_000
// Tetti del piano gratuito per lo spazio (D1 per database, R2 per account)
export const QUOTA = { dbBytes: 500 * 1024 * 1024, fileBytes: 10 * 1024 * 1024 * 1024 }
const stats = async (env: Env) => {
  const now = Date.now()
  const [totals, kinds, makes, weeks] = await Promise.all([
    env.DB.prepare(
      `SELECT
         (SELECT COUNT(*) FROM users WHERE id NOT LIKE 'guest-%') AS google,
         (SELECT COUNT(*) FROM users WHERE id LIKE 'guest-%') AS guests,
         (SELECT COUNT(*) FROM users WHERE created_at > ?1) AS new7,
         (SELECT COUNT(*) FROM users WHERE created_at > ?2) AS new30,
         (SELECT COUNT(DISTINCT user_id) FROM records WHERE updated_at > ?1) AS active7,
         (SELECT COUNT(DISTINCT user_id) FROM records WHERE updated_at > ?2) AS active30,
         (SELECT COUNT(DISTINCT user_id) FROM push_subs) AS push,
         (SELECT COUNT(*) FROM files) AS files,
         (SELECT COALESCE(SUM(bytes), 0) FROM users) AS bytes`,
    ).bind(now - WEEK, now - 30 * 86_400_000).all(),
    env.DB.prepare('SELECT kind, COUNT(*) AS n FROM records WHERE deleted = 0 GROUP BY kind').all(),
    env.DB.prepare("SELECT json_extract(data, '$.make') AS make, COUNT(*) AS n FROM records WHERE kind = 'bikes' AND deleted = 0 GROUP BY make ORDER BY n DESC LIMIT 8").all(),
    env.DB.prepare("SELECT CAST((?1 - created_at) / ?2 AS INTEGER) AS ago, SUM(id NOT LIKE 'guest-%') AS google, SUM(id LIKE 'guest-%') AS guests FROM users WHERE created_at > ?1 - 8 * ?2 GROUP BY ago")
      .bind(now, WEEK).all(),
  ])
  return {
    at: now,
    ...(totals.results[0] as Record<string, number>),
    dbBytes: (totals.meta as { size_after?: number } | undefined)?.size_after ?? null,
    quota: QUOTA,
    records: Object.fromEntries((kinds.results as { kind: string; n: number }[]).map((r) => [r.kind, r.n])),
    makes: makes.results,
    weeks: Array.from({ length: 8 }, (_, i) => {
      const w = (weeks.results as { ago: number; google: number; guests: number }[]).find((r) => r.ago === 7 - i)
      return { google: w?.google ?? 0, guests: w?.guests ?? 0 }
    }),
  }
}

export const handle = async (req: Request, env: Env, keys?: () => Promise<Jwk[]>): Promise<Response> => {
  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/api/, '')
  try {
    if (req.method !== 'GET' && !sameOrigin(req)) return fail(403, 'Origine non ammessa')
    if (req.method === 'POST' && path === '/auth/google') return await login(req, env, keys)
    if (req.method === 'POST' && path === '/auth/guest') return await guestLogin(req, env)

    const session = await sessionOf(req, env)
    const userId = session?.userId
    const res = await route(req, env, url, path, userId)
    if (session?.renew && !res.headers.has('set-cookie')) res.headers.append('set-cookie', session.renew)
    return res
  } catch (e) {
    if (e instanceof AuthError) return fail(401, e.message)
    if (e instanceof SyntaxError) return fail(400, 'JSON non valido')
    console.error(e)
    return fail(500, 'Errore del server')
  }
}

const route = async (req: Request, env: Env, url: URL, path: string, userId: string | undefined): Promise<Response> => {
  {
    if (path === '/me' && req.method === 'GET') {
      if (!userId) return fail(401, 'Non autenticato')
      const me = await env.DB.prepare('SELECT email, bytes, notify_hour AS notifyHour FROM users WHERE id = ?').bind(userId).first()
      return json(me && { ...me, admin: await isAdmin(env, userId) })
    }
    if (!userId) return fail(401, 'Non autenticato')

    if (req.method === 'POST' && path === '/auth/logout') {
      await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(cookie(req) ?? '')).run()
      return json({ ok: true }, 200, { 'set-cookie': setCookie('', 0) })
    }
    if (req.method === 'POST' && path === '/auth/logout-all') {
      // Anche le notifiche: un telefono perso non deve continuare a ricevere moto e scadenze
      await env.DB.batch([
        env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId),
        env.DB.prepare('DELETE FROM push_subs WHERE user_id = ?').bind(userId),
      ])
      return json({ ok: true }, 200, { 'set-cookie': setCookie('', 0) })
    }
    if (req.method === 'GET' && path === '/admin/stats') return (await isAdmin(env, userId)) ? json(await stats(env)) : fail(404, 'Non trovato')
    if (req.method === 'GET' && path === '/account/export') return (await limited(env, 'export', userId)) ?? (await exportAccount(env, userId))
    if (req.method === 'POST' && path === '/account/delete') return await deleteAccount(env, userId)
    const bikeId = /^\/bikes\/([^/]+)$/.exec(path)?.[1]
    if (req.method === 'DELETE' && bikeId) {
      if (!isId(bikeId)) return fail(400, 'Moto non valida')
      return await deleteBike(env, userId, bikeId)
    }
    // Per utente, non per IP: dietro lo stesso IP dell'operatore mobile ci sono molte persone (decisione del 28/11/2026)
    if (req.method === 'POST' && path === '/sync/push') return (await limited(env, 'sync', userId)) ?? (await push(req, env, userId))
    if (req.method === 'POST' && path === '/push/subscribe') return await subscribe(req, env, userId)
    if (req.method === 'POST' && path === '/push/unsubscribe') {
      const { endpoint } = await body(req)
      await env.DB.prepare('DELETE FROM push_subs WHERE endpoint = ? AND user_id = ?').bind(typeof endpoint === 'string' ? endpoint : '', userId).run()
      return json({ ok: true })
    }
    if (req.method === 'POST' && path === '/push/test') {
      const stop = await limited(env, 'pushTest', userId)
      if (stop) return stop
      const { results } = await env.DB.prepare('SELECT endpoint, p256dh, auth FROM push_subs WHERE user_id = ?').bind(userId).all<{ endpoint: string; p256dh: string; auth: string }>()
      const status = await Promise.all(results.map((sub) => sendPush(env, sub, { title: 'Revkeeper', body: 'Le notifiche funzionano.' })))
      return json({ sent: status.filter((x) => x < 300).length, status })
    }
    if (req.method === 'GET' && path === '/sync/pull') return await pull(url, env, userId)
    const file = /^\/files\/(.+)$/.exec(path)?.[1]
    if (file && FILE_ID.test(file)) {
      if (req.method === 'PUT') return (await limited(env, 'upload', userId)) ?? (await putFile(req, env, userId, file))
      if (req.method === 'GET') return await getFile(env, userId, file)
    }
    return fail(404, 'Non trovato')
  }
}
