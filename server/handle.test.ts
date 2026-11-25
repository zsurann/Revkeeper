import { expect, it, vi } from 'vitest'
import { handle, LIMITS, type Env } from './api'
import type { Jwk } from './google'
import { FakeD1, FakeR2 } from './testing/cloud'
import { unzip } from './testing/unzip'

const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')
const ORIGIN = 'https://revkeeper.pages.dev'
const DEV = '22222222-2222-4222-8222-222222222222'
const BIKE = '11111111-1111-4111-8111-111111111111'
const FILE = '33333333-3333-4333-8333-333333333333'
const FILE_B = '66666666-6666-4666-8666-666666666666'
const AT = 1_700_000_000_000

const signer = async () => {
  const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']) as CryptoKeyPair
  const jwk = { ...(await crypto.subtle.exportKey('jwk', pair.publicKey)), kid: 'k1' } as Jwk
  const keys = async () => [jwk]
  const sign = async (sub = '42', email = 'a@b.it') => {
    const head = `${enc({ alg: 'RS256', kid: 'k1' })}.${enc({ iss: 'https://accounts.google.com', aud: 'client', exp: 9_000_000_000, sub, email, email_verified: true })}`
    const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(head))
    return `${head}.${Buffer.from(sig).toString('base64url')}`
  }
  return { keys, sign }
}

const cloud = () => {
  const d1 = new FakeD1()
  const files = new FakeR2()
  const env = { DB: d1, FILES: files, GOOGLE_CLIENT_ID: 'client', VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv', VAPID_SUBJECT: ORIGIN } as unknown as Env
  return { env, d1, files }
}

const call = (env: Env, path: string, init: RequestInit & { cookie?: string; origin?: string | null } = {}, keys?: () => Promise<Jwk[]>) => {
  const headers = new Headers(init.headers)
  if (init.cookie) headers.set('cookie', `__Host-rk=${init.cookie}`)
  if (init.origin !== null) headers.set('origin', init.origin === undefined ? ORIGIN : init.origin)
  const { cookie: _c, origin: _o, ...rest } = init
  return handle(new Request(`${ORIGIN}/api${path}`, { ...rest, headers }), env, keys)
}

const tokenOf = (res: Response) => /__Host-rk=([^;]*)/.exec(res.headers.get('set-cookie') ?? '')?.[1] ?? ''
const bike = (extra: Record<string, unknown> = {}) => ({ id: BIKE, updatedAt: AT, make: 'Kawasaki', model: 'Z650', year: 2017, startKm: 30000, startDate: '2026-01-01', ...extra })

const session = async () => {
  const { env, d1, files } = cloud()
  const { keys, sign } = await signer()
  const login = async (email = 'a@b.it') => {
    const res = await call(env, '/auth/google', { method: 'POST', body: JSON.stringify({ credential: await sign('42', email) }) }, keys)
    expect(res.status).toBe(200)
    return tokenOf(res)
  }
  return { env, d1, files, keys, login }
}

const push = (env: Env, cookie: string, changes: unknown[]) =>
  call(env, '/sync/push', { method: 'POST', cookie, body: JSON.stringify({ deviceId: DEV, changes }) })

const putFile = (env: Env, cookie: string, id: string, bytes: Uint8Array, headers: Record<string, string> = {}) => {
  const stream = new ReadableStream({ start(c) { c.enqueue(bytes); c.close() } })
  return call(env, `/files/${id}`, { method: 'PUT', body: stream, duplex: 'half', cookie, headers: { 'content-type': 'image/jpeg', ...headers } } as RequestInit)
}

it('login, sessione e intestazioni di sicurezza', async () => {
  const { env, login } = await session()
  const anon = await call(env, '/me')
  expect(anon.status).toBe(401)
  expect(anon.headers.get('x-frame-options')).toBe('DENY')
  expect(anon.headers.get('content-security-policy')).toContain("frame-ancestors 'none'")
  expect(anon.headers.get('strict-transport-security')).toContain('max-age=31536000')
  expect(anon.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
  expect(anon.headers.get('permissions-policy')).toContain('camera=(self)')
  expect(anon.headers.get('permissions-policy')).not.toContain('notifications') // voce inesistente: Chrome la segnala a ogni pagina
  expect(anon.headers.get('x-content-type-options')).toBe('nosniff')

  const cookie = await login()
  const me = await call(env, '/me', { cookie })
  expect(await me.json()).toMatchObject({ email: 'a@b.it', bytes: 0 })

  const out = await call(env, '/auth/logout', { method: 'POST', cookie })
  expect(out.status).toBe(200)
  expect((await call(env, '/me', { cookie })).status).toBe(401)
})

it('rifiuta un origine diversa sulle scritture e non sulla lettura', async () => {
  const { env, login } = await session()
  const cookie = await login()
  const forged = await call(env, '/sync/push', { method: 'POST', cookie, origin: 'https://evil.example', body: '{}' })
  expect(forged.status).toBe(403)
  const read = await call(env, '/sync/pull', { cookie, origin: 'https://evil.example' })
  expect(read.status).toBe(200)
  const badLogin = await call(env, '/auth/google', { method: 'POST', origin: 'https://evil.example', body: '{}' })
  expect(badLogin.status).toBe(403)
})

it('accetta un record valido, rifiuta lo schema e salta il JSON rotto in pull', async () => {
  const err = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const { env, d1, login } = await session()
  const cookie = await login()
  const bad = await push(env, cookie, [{ kind: 'bikes', id: BIKE, updatedAt: AT, data: { ...bike(), year: 'duemila' } }])
  expect(bad.status).toBe(400)
  expect((await (await call(env, '/sync/pull', { cookie })).json()).changes).toEqual([])

  const ok = await push(env, cookie, [{ kind: 'bikes', id: BIKE, updatedAt: AT, data: bike({ plate: 'AB123CD', tyres: { front: '120/70 ZR 17', pressureSolo: { front: 2.5, rear: 2.9 } } }) }])
  expect(ok.status).toBe(200)
  const gone = await push(env, cookie, [{ kind: 'bikes', id: BIKE, updatedAt: AT + 5, deleted: true, data: null }])
  expect(gone.status).toBe(200)
  const huge = 'x'.repeat(LIMITS.recordBytes)
  const over = await push(env, cookie, [{ kind: 'bikes', id: BIKE, updatedAt: AT + 1, data: { ...bike(), updatedAt: AT + 1, pad: huge } }])
  expect(over.status).toBe(413)

  d1.exec("INSERT INTO records(user_id, kind, id, data, updated_at, device_id, deleted, rev) VALUES ('42', 'bikes', '55555555-5555-4555-8555-555555555555', '{', 1, ?, 0, 50)", DEV)
  const page = await call(env, '/sync/pull', { cookie })
  expect(page.status).toBe(200)
  const body = await page.json()
  expect(body.changes.map((c: { id: string }) => c.id)).toEqual([BIKE])
  expect(body.cursor).toBe(50)
  expect(err).toHaveBeenCalled()
  err.mockRestore()
})

it('carica e rilegge un file, con la quota sui byte veri', async () => {
  const { env, d1, files, login } = await session()
  const cookie = await login()
  const bytes = new Uint8Array([1, 2, 3, 4])
  expect((await putFile(env, cookie, FILE, bytes, { 'content-length': '1' })).status).toBe(200)
  const got = await call(env, `/files/${FILE}`, { cookie })
  expect(got.status).toBe(200)
  expect(got.headers.get('content-disposition')).toBe('inline')
  expect(got.headers.get('x-frame-options')).toBe('DENY')
  expect(new Uint8Array(await got.arrayBuffer())).toEqual(bytes)
  expect(d1.prepare('SELECT bytes AS b FROM users WHERE id = ?').bind('42').first<{ b: number }>()?.b).toBe(4)
  expect((await call(env, `/files/${FILE}`)).status).toBe(401)

  d1.exec('UPDATE users SET bytes = ? WHERE id = ?', LIMITS.userBytes - 30, '42')
  expect((await putFile(env, cookie, FILE_B, new Uint8Array(40))).status).toBe(507)
  expect((await putFile(env, cookie, FILE_B, new Uint8Array(20))).status).toBe(200)
  expect(d1.prepare('SELECT bytes AS b FROM users WHERE id = ?').bind('42').first<{ b: number }>()?.b).toBe(LIMITS.userBytes - 10)

  // stesso file più piccolo: si libera la differenza
  expect((await putFile(env, cookie, FILE_B, new Uint8Array(5))).status).toBe(200)
  expect(d1.prepare('SELECT bytes AS b FROM users WHERE id = ?').bind('42').first<{ b: number }>()?.b).toBe(LIMITS.userBytes - 25)

  d1.exec('UPDATE users SET bytes = ? WHERE id = ?', LIMITS.userBytes - 80, '42')
  const [a, b] = await Promise.all([
    putFile(env, cookie, '77777777-7777-4777-8777-777777777777', new Uint8Array(50)),
    putFile(env, cookie, '88888888-8888-4888-8888-888888888888', new Uint8Array(50)),
  ])
  expect([a.status, b.status].sort()).toEqual([200, 507])
  expect(d1.prepare('SELECT bytes AS b FROM users WHERE id = ?').bind('42').first<{ b: number }>()?.b).toBe(LIMITS.userBytes - 30)

  files.failPut = true
  const before = d1.prepare('SELECT bytes AS b FROM users WHERE id = ?').bind('42').first<{ b: number }>()?.b
  expect((await putFile(env, cookie, '99999999-9999-4999-8999-999999999999', new Uint8Array(10))).status).toBe(500)
  expect(d1.prepare('SELECT bytes AS b FROM users WHERE id = ?').bind('42').first<{ b: number }>()?.b).toBe(before)
  expect(d1.prepare('SELECT count(*) AS n FROM files WHERE id = ?').bind('99999999-9999-4999-8999-999999999999').first<{ n: number }>()?.n).toBe(0)
})

it('iscrive e disiscrive un dispositivo', async () => {
  const { env, d1, login } = await session()
  const cookie = await login()
  const body = { subscription: { endpoint: 'https://push.example/a', keys: { p256dh: 'k', auth: 'a' } }, hour: 9, tz: 'Europe/Rome' }
  expect((await call(env, '/push/subscribe', { method: 'POST', cookie, body: JSON.stringify({ ...body, hour: 25 }) })).status).toBe(400)
  expect((await call(env, '/push/subscribe', { method: 'POST', cookie, body: JSON.stringify(body) })).status).toBe(200)
  expect(d1.prepare('SELECT notify_hour AS h, tz FROM users WHERE id = ?').bind('42').first()).toMatchObject({ h: 9, tz: 'Europe/Rome' })
  // l'ora scelta torna all'app, così il menu mostra quella salvata e non sempre le 09:00
  await call(env, '/push/subscribe', { method: 'POST', cookie, body: JSON.stringify({ ...body, hour: 20 }) })
  expect(await (await call(env, '/me', { cookie })).json()).toMatchObject({ email: 'a@b.it', notifyHour: 20 })
  expect((await call(env, '/push/unsubscribe', { method: 'POST', cookie, body: JSON.stringify({ endpoint: body.subscription.endpoint }) })).status).toBe(200)
  expect(d1.prepare('SELECT count(*) AS n FROM push_subs').first<{ n: number }>()?.n).toBe(0)
})

it('esporta i dati in uno zip ed elimina account, file e sessioni', async () => {
  const { env, d1, files, login } = await session()
  const cookie = await login()
  const second = await login()
  await push(env, cookie, [
    { kind: 'bikes', id: BIKE, updatedAt: AT, data: bike() },
    { kind: 'attachments', id: FILE, updatedAt: AT, data: { id: FILE, updatedAt: AT, name: 'fattura.pdf', type: 'application/pdf', size: 4 } },
  ])
  expect((await putFile(env, cookie, FILE, new Uint8Array([9, 8, 7, 6]))).status).toBe(200)
  await call(env, '/push/subscribe', { method: 'POST', cookie, body: JSON.stringify({ subscription: { endpoint: 'https://push.example/a', keys: { p256dh: 'k', auth: 'a' } }, hour: 8, tz: 'Europe/Rome' }) })

  const exp = await call(env, '/account/export', { cookie })
  expect(exp.status).toBe(200)
  expect(exp.headers.get('content-disposition')).toContain('revkeeper-dati.zip')
  const zip = unzip(new Uint8Array(await exp.arrayBuffer()))
  const dati = JSON.parse(new TextDecoder().decode(zip.get('dati.json')!)) as { account: { email: string }; records: { id: string }[]; files: { path: string }[]; notifications: string[] }
  expect(dati.account.email).toBe('a@b.it')
  expect(dati.records.map((r) => r.id).sort()).toEqual([BIKE, FILE].sort())
  expect(dati.notifications).toEqual(['https://push.example/a'])
  expect([...zip.get(dati.files[0]!.path)!]).toEqual([9, 8, 7, 6])

  expect((await call(env, '/account/export')).status).toBe(401)
  const del = await call(env, '/account/delete', { method: 'POST', cookie })
  expect(del.status).toBe(200)
  expect((await call(env, '/me', { cookie })).status).toBe(401)
  expect((await call(env, '/me', { cookie: second })).status).toBe(401)
  expect(files.objects.size).toBe(0)
  for (const table of ['users', 'sessions', 'records', 'files', 'push_subs'])
    expect(d1.prepare(`SELECT count(*) AS n FROM ${table}`).first<{ n: number }>()?.n).toBe(0)
})

it('esci da tutti i dispositivi revoca ogni sessione', async () => {
  const { env, login } = await session()
  const a = await login()
  const b = await login()
  expect((await call(env, '/auth/logout-all', { method: 'POST', cookie: a })).status).toBe(200)
  expect((await call(env, '/me', { cookie: a })).status).toBe(401)
  expect((await call(env, '/me', { cookie: b })).status).toBe(401)
})

it('esci ovunque spegne anche le notifiche di tutti i telefoni', async () => {
  const { env, d1, login } = await session()
  const a = await login()
  const sub = (endpoint: string) => ({ subscription: { endpoint, keys: { p256dh: 'k', auth: 'a' } }, hour: 9, tz: 'Europe/Rome' })
  await call(env, '/push/subscribe', { method: 'POST', cookie: a, body: JSON.stringify(sub('https://push.example/a')) })
  await call(env, '/push/subscribe', { method: 'POST', cookie: a, body: JSON.stringify(sub('https://push.example/perso')) })
  expect((await call(env, '/auth/logout-all', { method: 'POST', cookie: a })).status).toBe(200)
  expect(d1.prepare('SELECT count(*) AS n FROM push_subs').first<{ n: number }>()?.n).toBe(0)
})

it('un tombstone più vecchio non cancella il file di un allegato ancora vivo', async () => {
  const { env, files, login } = await session()
  const cookie = await login()
  const att = (extra: Record<string, unknown>) => ({ kind: 'attachments', id: FILE, ...extra })
  expect((await putFile(env, cookie, FILE, new Uint8Array([1, 2, 3]))).status).toBe(200)
  const data = { id: FILE, updatedAt: AT + 10, name: 'libretto.pdf', type: 'application/pdf', size: 3 }
  expect((await push(env, cookie, [att({ data, updatedAt: AT + 10 })])).status).toBe(200)
  // un altro telefono aveva cancellato l'allegato prima della modifica più recente: perde, il file resta
  expect((await push(env, cookie, [att({ data: null, updatedAt: AT, deleted: true })])).status).toBe(200)
  expect((await call(env, `/files/${FILE}`, { cookie })).status).toBe(200)
  // una cancellazione più recente vince e libera il file
  expect((await push(env, cookie, [att({ data: null, updatedAt: AT + 20, deleted: true })])).status).toBe(200)
  expect((await call(env, `/files/${FILE}`, { cookie })).status).toBe(404)
  void files
})

it('limita i tentativi di accesso per IP e le notifiche di prova per utente', async () => {
  const { env, keys } = await session()
  const bad = () => call(env, '/auth/google', { method: 'POST', headers: { 'cf-connecting-ip': '203.0.113.9' }, body: JSON.stringify({ credential: 'a.b.c' }) }, keys)
  for (let i = 0; i < 20; i++) expect((await bad()).status).toBe(401)
  const over = await bad()
  expect(over.status).toBe(429)
  expect(Number(over.headers.get('retry-after'))).toBeGreaterThan(0)
  // un altro IP passa
  expect((await call(env, '/auth/google', { method: 'POST', headers: { 'cf-connecting-ip': '198.51.100.1' }, body: JSON.stringify({ credential: 'a.b.c' }) }, keys)).status).toBe(401)
})

it("l'IP non si salva in chiaro nei contatori", async () => {
  const { env, d1, keys } = await session()
  await call(env, '/auth/google', { method: 'POST', headers: { 'cf-connecting-ip': '203.0.113.9' }, body: JSON.stringify({ credential: 'a.b.c' }) }, keys)
  const keysSaved = d1.prepare('SELECT key FROM rate_limits').all().results.map((r) => String((r as { key: string }).key))
  expect(keysSaved.join()).not.toContain('203.0.113.9')
})

it('notifiche di prova: dopo 5 in un’ora risponde 429', async () => {
  const { env, login } = await session()
  const cookie = await login()
  for (let i = 0; i < 5; i++) expect((await call(env, '/push/test', { method: 'POST', cookie, body: '{}' })).status).toBe(200)
  expect((await call(env, '/push/test', { method: 'POST', cookie, body: '{}' })).status).toBe(429)
})
