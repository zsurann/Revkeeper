import { expect, it, vi } from 'vitest'
import { handle, LIMITS, type Env } from './api'
import { remindersFor, type Rec } from './reminders'
import type { Jwk } from './google'
import { FakeD1, FakeR2 } from './testing/cloud'
import { RATE } from './ratelimit'
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
  const login = async (email = 'a@b.it', sub = '42') => {
    const res = await call(env, '/auth/google', { method: 'POST', body: JSON.stringify({ credential: await sign(sub, email) }) }, keys)
    expect(res.status).toBe(200)
    return tokenOf(res)
  }
  return { env, d1, files, keys, login, sign }
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
  const body = { subscription: { endpoint: 'https://fcm.googleapis.com/fcm/send/a', keys: { p256dh: 'k', auth: 'a' } }, hour: 9, tz: 'Europe/Rome' }
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
  await call(env, '/push/subscribe', { method: 'POST', cookie, body: JSON.stringify({ subscription: { endpoint: 'https://fcm.googleapis.com/fcm/send/a', keys: { p256dh: 'k', auth: 'a' } }, hour: 8, tz: 'Europe/Rome' }) })

  const exp = await call(env, '/account/export', { cookie })
  expect(exp.status).toBe(200)
  expect(exp.headers.get('content-disposition')).toContain('revkeeper-dati.zip')
  const zip = unzip(new Uint8Array(await exp.arrayBuffer()))
  const dati = JSON.parse(new TextDecoder().decode(zip.get('dati.json')!)) as { account: { email: string }; records: { id: string }[]; files: { path: string }[]; notifications: string[] }
  expect(dati.account.email).toBe('a@b.it')
  expect(dati.records.map((r) => r.id).sort()).toEqual([BIKE, FILE].sort())
  expect(dati.notifications).toEqual(['https://fcm.googleapis.com/fcm/send/a'])
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
  await call(env, '/push/subscribe', { method: 'POST', cookie: a, body: JSON.stringify(sub('https://fcm.googleapis.com/fcm/send/a')) })
  await call(env, '/push/subscribe', { method: 'POST', cookie: a, body: JSON.stringify(sub('https://fcm.googleapis.com/fcm/send/perso')) })
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
  for (let i = 0; i < RATE.login.max; i++) expect((await bad()).status).toBe(401)
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

it('elimina una moto dal server: verifica proprietà, pulisce D1 e R2, aggiorna quota e sync multi-dispositivo', async () => {
  const { env, d1, files, login } = await session()
  const ownerCookie = await login('owner@b.it', '42')
  const otherCookie = await login('other@b.it', '99')

  const BIKE_2 = '11111111-1111-4111-8111-222222222222'
  const READ_1 = '44444444-4444-4444-8444-111111111111'
  const ITEM_1 = '55555555-5555-4555-8555-111111111111'
  const SVC_1 = '77777777-7777-4777-8777-111111111111'
  const DOC_1 = '88888888-8888-4888-8888-111111111111'
  const READ_2 = '44444444-4444-4444-8444-222222222222'

  expect((await putFile(env, ownerCookie, FILE, new Uint8Array([1, 2, 3, 4]))).status).toBe(200)
  expect((await putFile(env, ownerCookie, FILE_B, new Uint8Array([5, 6]))).status).toBe(200)

  expect((await push(env, ownerCookie, [
    { kind: 'bikes', id: BIKE, updatedAt: AT, data: bike({ photoId: FILE }) },
    { kind: 'bikes', id: BIKE_2, updatedAt: AT, data: { ...bike({ id: BIKE_2, model: 'MT-07', photoId: FILE_B }) } },
    { kind: 'readings', id: READ_1, updatedAt: AT, data: { id: READ_1, updatedAt: AT, bikeId: BIKE, date: '2026-11-01', km: 31000 } },
    { kind: 'readings', id: READ_2, updatedAt: AT, data: { id: READ_2, updatedAt: AT, bikeId: BIKE_2, date: '2026-11-01', km: 5000 } },
    { kind: 'items', id: ITEM_1, updatedAt: AT, data: { id: ITEM_1, updatedAt: AT, bikeId: BIKE, item: 'engine_oil', label: 'Olio', action: 'replace', km: 10000, months: 12, origin: 'model', notes: '10W-40' } },
    { kind: 'services', id: SVC_1, updatedAt: AT, data: { id: SVC_1, updatedAt: AT, bikeId: BIKE, date: '2026-06-01', km: 30000, itemIds: [ITEM_1], attachmentIds: [FILE] } },
    { kind: 'documents', id: DOC_1, updatedAt: AT, data: { id: DOC_1, updatedAt: AT, bikeId: BIKE, kind: 'revisione', dueDate: '2026-11-27', attachmentIds: [] } },
    { kind: 'attachments', id: FILE, updatedAt: AT, data: { id: FILE, updatedAt: AT, name: 'foto.jpg', type: 'image/jpeg', size: 4 } },
    { kind: 'attachments', id: FILE_B, updatedAt: AT, data: { id: FILE_B, updatedAt: AT, name: 'altra.jpg', type: 'image/jpeg', size: 2 } },
  ])).status).toBe(200)

  const beforeRev = d1.prepare('SELECT rev FROM users WHERE id = ?').bind('42').first<{ rev: number }>()!.rev

  // Sicurezza: anonimo (401), id non valido (400), altro utente (404) non toccano nulla
  expect((await call(env, `/bikes/${BIKE}`, { method: 'DELETE' })).status).toBe(401)
  expect((await call(env, '/bikes/not-a-uuid', { method: 'DELETE', cookie: ownerCookie })).status).toBe(400)
  expect((await call(env, `/bikes/${BIKE}`, { method: 'DELETE', cookie: otherCookie })).status).toBe(404)
  expect(files.objects.has(`42/${FILE}`)).toBe(true)

  // Proprietario elimina BIKE
  const res = await call(env, `/bikes/${BIKE}`, { method: 'DELETE', cookie: ownerCookie })
  expect(res.status).toBe(200)
  expect(await res.json()).toMatchObject({ ok: true, deletedRecords: 6, deletedFiles: 1 })

  // R2 e quota: FILE rimosso, FILE_B della seconda moto intatto
  expect(files.objects.has(`42/${FILE}`)).toBe(false)
  expect(files.objects.has(`42/${FILE_B}`)).toBe(true)
  expect(d1.prepare('SELECT bytes FROM users WHERE id = ?').bind('42').first<{ bytes: number }>()).toEqual({ bytes: 2 })
  expect(d1.prepare('SELECT count(*) AS n FROM files WHERE user_id = ?').bind('42').first<{ n: number }>()).toEqual({ n: 1 })

  // D1: i record di BIKE sono tombstone senza dati (data IS NULL, deleted = 1), BIKE_2 resta viva
  const aliveRows = d1.prepare('SELECT kind, id, data FROM records WHERE user_id = ? AND deleted = 0').bind('42').all<{ kind: string; id: string; data: string }>().results
  expect(aliveRows.map((r) => r.id).sort()).toEqual([BIKE_2, FILE_B, READ_2].sort())

  // Secondo dispositivo riceve i tombstone dal cursore precedente
  const pulled = await (await call(env, `/sync/pull?since=${beforeRev}`, { cookie: ownerCookie })).json() as {
    changes: { kind: string; id: string; deleted: boolean; data: unknown }[]
  }
  expect(pulled.changes.every((c) => c.deleted && c.data === null)).toBe(true)
  expect(pulled.changes.map((c) => c.id).sort()).toEqual([BIKE, READ_1, ITEM_1, SVC_1, DOC_1, FILE].sort())

  // I promemoria non includono più la moto eliminata
  const recs: Rec[] = aliveRows.map((r) => ({ kind: r.kind, data: JSON.parse(r.data) }))
  expect(remindersFor(recs, '2026-11-20')).toEqual([])
})

it('il sync accetta correzione km in calo e ricalcola i promemoria', async () => {
  const { env, d1, login } = await session()
  const cookie = await login()
  const READ_WRONG = '44444444-4444-4444-8444-333333333333'
  const READ_RIGHT = '44444444-4444-4444-8444-444444444444'
  const ITEM_1 = '55555555-5555-4555-8555-222222222222'
  await push(env, cookie, [
    { kind: 'bikes', id: BIKE, updatedAt: AT, data: bike({ startKm: 12000 }) },
    { kind: 'items', id: ITEM_1, updatedAt: AT, data: { id: ITEM_1, updatedAt: AT, bikeId: BIKE, item: 'engine_oil', label: 'Olio', action: 'replace', km: 10000, months: 12, origin: 'model' } },
    { kind: 'readings', id: READ_WRONG, updatedAt: AT, data: { id: READ_WRONG, updatedAt: AT, bikeId: BIKE, date: '2026-10-21', km: 16000 } },
  ])
  // Correzione: tombstone sulla lettura da 16.000 e nuova lettura a 15.500
  expect((await push(env, cookie, [
    { kind: 'readings', id: READ_WRONG, updatedAt: AT + 10, deleted: true, data: null },
    { kind: 'readings', id: READ_RIGHT, updatedAt: AT + 10, data: { id: READ_RIGHT, updatedAt: AT + 10, bikeId: BIKE, date: '2026-10-21', km: 15500 } },
  ])).status).toBe(200)
  const alive = d1.prepare('SELECT kind, data FROM records WHERE user_id = ? AND deleted = 0').bind('42').all<{ kind: string; data: string }>().results
  const recs: Rec[] = alive.map((r) => ({ kind: r.kind, data: JSON.parse(r.data) }))
  expect(remindersFor(recs, '2026-11-20')).toEqual(['Kawasaki Z650: aggiorna i km (15.500 km di 30 giorni fa)'])
})

it('ospite: notifiche senza Google, poi al login passano all\'account e l\'ospite sparisce', async () => {
  const { env, d1, keys, sign } = await session()
  const g = await call(env, '/auth/guest', { method: 'POST' })
  expect(g.status).toBe(200)
  const guest = tokenOf(g)
  expect((await push(env, guest, [{ kind: 'bikes', id: BIKE, updatedAt: AT, data: bike() }])).status).toBe(200)
  const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/1', keys: { p256dh: 'p', auth: 'a' } }
  expect((await call(env, '/push/subscribe', { method: 'POST', cookie: guest, body: JSON.stringify({ subscription: sub, hour: 8, tz: 'Europe/Rome' }) })).status).toBe(200)

  const res = await call(env, '/auth/google', { method: 'POST', cookie: guest, body: JSON.stringify({ credential: await sign('77', 'c@d.it') }) }, keys)
  expect(res.status).toBe(200)
  const subs = d1.prepare('SELECT user_id FROM push_subs').all<{ user_id: string }>()
  expect((await subs).results).toEqual([{ user_id: '77' }])
  const u = await d1.prepare("SELECT notify_hour FROM users WHERE id = '77'").first<{ notify_hour: number }>()
  expect(u?.notify_hour).toBe(8)
  expect((await d1.prepare("SELECT count(*) n FROM users WHERE id LIKE 'guest-%'").first<{ n: number }>())?.n).toBe(0)
  expect((await d1.prepare("SELECT count(*) n FROM records WHERE user_id LIKE 'guest-%'").first<{ n: number }>())?.n).toBe(0)
  expect((await call(env, '/me', { cookie: guest })).status).toBe(401)
})

it('statistiche solo per le email admin, con conteggi aggregati', async () => {
  const { env, login } = await session()
  const user = await login('altro@b.it', '7')
  await push(env, user, [{ kind: 'bikes', id: BIKE, updatedAt: Date.now(), data: bike({ updatedAt: Date.now(), plate: 'AB123CD' }) }])
  expect((await call(env, '/admin/stats', { cookie: user })).status).toBe(404)

  env.ADMIN_EMAILS = ' io@b.it , altro2@b.it'
  const admin = await login('IO@b.it', '1')
  expect((await (await call(env, '/me', { cookie: admin })).json()).admin).toBe(true)
  expect((await (await call(env, '/me', { cookie: user })).json()).admin).toBe(false)
  expect((await call(env, '/admin/stats', { cookie: user })).status).toBe(404)
  expect((await call(env, '/admin/stats')).status).toBe(401)

  const res = await call(env, '/admin/stats', { cookie: admin })
  expect(res.status).toBe(200)
  const s = await res.json()
  expect(s).toMatchObject({ google: 2, guests: 0, new7: 2, active7: 1, records: { bikes: 1 }, makes: [{ make: 'Kawasaki', n: 1 }] })
  expect(s.weeks).toHaveLength(8)
  expect(s.weeks[7]).toEqual({ google: 2, guests: 0 })
  expect(JSON.stringify(s)).not.toMatch(/@|AB123CD/)
})

it('notifiche: solo servizi dei browser, e un telefono di un altro account non si sposta', async () => {
  const { env, d1, login } = await session()
  const a = await login('a@b.it', '1')
  const b = await login('b@b.it', '2')
  const sub = (endpoint: string) => JSON.stringify({ subscription: { endpoint, keys: { p256dh: 'k', auth: 'a' } }, hour: 9, tz: 'Europe/Rome' })
  for (const bad of ['https://evil.example/x', 'https://fcm.googleapis.com.evil.it/x', 'http://fcm.googleapis.com/x', 'https://169.254.169.254/'])
    expect((await call(env, '/push/subscribe', { method: 'POST', cookie: a, body: sub(bad) })).status).toBe(400)
  for (const ok of ['https://fcm.googleapis.com/fcm/send/x', 'https://web.push.apple.com/x', 'https://updates.push.services.mozilla.com/wpush/v2/x', 'https://wns2-par02p.notify.windows.com/w/?token=x'])
    expect((await call(env, '/push/subscribe', { method: 'POST', cookie: a, body: sub(ok) })).status).toBe(200)

  await call(env, '/push/subscribe', { method: 'POST', cookie: b, body: sub('https://fcm.googleapis.com/fcm/send/x') })
  expect(d1.prepare('SELECT user_id FROM push_subs WHERE endpoint = ?').bind('https://fcm.googleapis.com/fcm/send/x').all().results).toEqual([{ user_id: '1' }])
})

it('sincronizzazione con tetto orario per utente', async () => {
  const { env, login } = await session()
  const cookie = await login()
  for (let i = 0; i < 120; i++) expect((await push(env, cookie, [])).status).toBe(200)
  const res = await push(env, cookie, [])
  expect(res.status).toBe(429)
  expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(0)
})

it('un nuovo ospite pulisce gli ospiti senza sessione da oltre 7 giorni', async () => {
  const { env, d1 } = await session()
  const old = Date.now() - 8 * 86_400_000
  d1.exec("INSERT INTO users(id, email, created_at) VALUES ('guest-vecchio', '', ?), ('guest-attivo', '', ?), ('guest-nuovo', '', ?)", old, old, Date.now())
  d1.exec("INSERT INTO sessions(token_hash, user_id, expires_at) VALUES ('h', 'guest-attivo', ?)", Date.now() + 1000)
  d1.exec("INSERT INTO push_subs(endpoint, user_id, p256dh, auth) VALUES ('https://fcm.googleapis.com/fcm/send/v', 'guest-vecchio', 'k', 'a')")
  expect((await call(env, '/auth/guest', { method: 'POST' })).status).toBe(200)
  const ids = d1.prepare("SELECT id FROM users WHERE id IN ('guest-vecchio', 'guest-attivo', 'guest-nuovo') ORDER BY id").all().results.map((r) => r.id)
  expect(ids).toEqual(['guest-attivo', 'guest-nuovo'])
  expect(d1.prepare('SELECT * FROM push_subs').all().results).toEqual([])
})

// Controllo pre-lancio del 28/11/2026 (issues/600-map-lancio-pubblico.md)
const uuid = (i: number, prefix = 'a') => `${prefix.repeat(8)}-0000-4000-8000-${String(i).padStart(12, '0')}`
const reading = (i: number) => ({ id: uuid(i), updatedAt: AT, bikeId: BIKE, date: '2026-01-02', km: 30000 + i })
const guest = async (env: Env) => tokenOf(await call(env, '/auth/guest', { method: 'POST' }))
const pullAll = async (env: Env, cookie: string) => {
  let since = 0
  const seen = new Set<string>()
  for (let i = 0; i < 50; i++) {
    const page = (await (await call(env, `/sync/pull?since=${since}`, { cookie })).json()) as { changes: { id: string }[]; cursor: number; more: boolean }
    for (const c of page.changes) seen.add(c.id)
    since = page.cursor
    if (!page.more) return seen
  }
  throw new Error('pull senza fine')
}

it('eliminare una moto con oltre 500 record non blocca il pull', async () => {
  const { env, login } = await session()
  const cookie = await login()
  expect((await push(env, cookie, [{ kind: 'bikes', id: BIKE, data: bike(), updatedAt: AT }])).status).toBe(200)
  for (let b = 0; b < 12; b++) expect((await push(env, cookie, Array.from({ length: 50 }, (_, i) => ({ kind: 'readings', id: uuid(b * 50 + i), data: reading(b * 50 + i), updatedAt: AT })))).status).toBe(200)
  expect((await call(env, `/bikes/${BIKE}`, { method: 'DELETE', cookie })).status).toBe(200)
  expect((await pullAll(env, cookie)).size).toBe(601)
})

it('dati vecchi con un solo rev oltre una pagina arrivano interi', async () => {
  const { env, d1, login } = await session()
  const cookie = await login()
  d1.exec("UPDATE users SET rev = 7 WHERE id = '42'")
  for (let i = 0; i < 520; i++) d1.exec("INSERT INTO records(user_id, kind, id, data, updated_at, device_id, deleted, rev) VALUES ('42', 'readings', ?, NULL, 1, 'd', 1, 7)", uuid(i))
  expect((await pullAll(env, cookie)).size).toBe(520)
})

it('un lotto con molti allegati cancellati resta in poche query', async () => {
  const { env, d1, files, login } = await session()
  const cookie = await login()
  const atts = Array.from({ length: 30 }, (_, i) => uuid(i, 'c'))
  for (const id of atts) {
    expect((await call(env, `/files/${id}`, { method: 'PUT', cookie, body: new Uint8Array([1, 2, 3]) })).status).toBe(200)
  }
  expect((await push(env, cookie, atts.map((id) => ({ kind: 'attachments', id, data: { id, updatedAt: AT, name: 'f.jpg', type: 'image/jpeg' }, updatedAt: AT })))).status).toBe(200)
  const prepared = vi.spyOn(d1, 'prepare')
  const batches = vi.spyOn(d1, 'batch')
  expect((await push(env, cookie, atts.map((id) => ({ kind: 'attachments', id, data: null, updatedAt: AT + 1, deleted: true })))).status).toBe(200)
  // query contate come D1: un batch vale una
  const inBatch = batches.mock.calls.reduce((n, [stmts]) => n + stmts.length, 0)
  expect(prepared.mock.calls.length - inBatch + batches.mock.calls.length).toBeLessThan(15)
  expect(files.objects.size).toBe(0)
  expect(d1.prepare('SELECT bytes FROM users WHERE id = ?').bind('42').first<{ bytes: number }>()?.bytes).toBe(0)
})

it('ospite: niente file online e tetto di record', async () => {
  const { env } = await session()
  const g = await guest(env)
  expect((await call(env, `/files/${FILE}`, { method: 'PUT', cookie: g, body: new Uint8Array([1]) })).status).toBe(403)
  for (let b = 0; b < LIMITS.guestRecords / 50; b++) expect(await (await push(env, g, Array.from({ length: 50 }, (_, i) => ({ kind: 'readings', id: uuid(b * 50 + i), data: reading(b * 50 + i), updatedAt: AT })))).json()).toEqual({ ok: true })
  expect((await push(env, g, [{ kind: 'readings', id: uuid(9999), data: reading(9999), updatedAt: AT }])).status).toBe(413)
  // aggiornare un record già presente non occupa altro spazio
  expect((await push(env, g, [{ kind: 'readings', id: uuid(0), data: { ...reading(0), km: 1, updatedAt: AT + 1 }, updatedAt: AT + 1 }])).status).toBe(200)
})

it('nuovi ospiti fermi quando lo spazio è oltre l\'80%', async () => {
  const { env, d1 } = await session()
  d1.exec("INSERT INTO flags(name, value) VALUES ('guests_closed', 1)")
  expect((await call(env, '/auth/guest', { method: 'POST' })).status).toBe(503)
})

it('i campi fuori dal modello dati non arrivano su D1', async () => {
  const { env, d1, login } = await session()
  const cookie = await login()
  const res = await push(env, cookie, [{ kind: 'bikes', id: BIKE, data: bike({ junk: 'x'.repeat(10_000), tyres: { front: '120/70', pad: 'y' } }), updatedAt: AT }])
  expect(res.status).toBe(200)
  const saved = JSON.parse(d1.prepare("SELECT data FROM records WHERE kind = 'bikes'").first<{ data: string }>()!.data)
  expect(saved.junk).toBeUndefined()
  expect(saved.tyres).toEqual({ front: '120/70' })
  expect(saved.make).toBe('Kawasaki')
})

it('corpi JSON strani danno 400, non 500', async () => {
  const { env, login, keys } = await session()
  const cookie = await login()
  expect((await call(env, '/auth/google', { method: 'POST', body: 'null' }, keys)).status).toBe(400)
  expect((await call(env, '/auth/google', { method: 'POST', body: JSON.stringify({ credential: 42 }) }, keys)).status).toBe(400)
  expect((await call(env, '/sync/push', { method: 'POST', cookie, body: 'null' })).status).toBe(400)
  expect((await call(env, '/push/subscribe', { method: 'POST', cookie, body: '[]' })).status).toBe(400)
  expect((await call(env, '/push/unsubscribe', { method: 'POST', cookie, body: 'null' })).status).toBe(200)
})

it('quota dei file: due caricamenti dello stesso file non abbassano il contatore', async () => {
  const { env, d1, login } = await session()
  const cookie = await login()
  await Promise.all([1, 2, 3].map((n) => call(env, `/files/${FILE}`, { method: 'PUT', cookie, body: new Uint8Array(n * 10) })))
  const bytes = d1.prepare('SELECT bytes FROM users WHERE id = ?').bind('42').first<{ bytes: number }>()!.bytes
  const size = d1.prepare('SELECT size FROM files WHERE id = ?').bind(FILE).first<{ size: number }>()!.size
  expect(bytes).toBe(size)
})

it('la sessione si rinnova da sola, al massimo una volta ogni 30 giorni', async () => {
  const { env, d1, login } = await session()
  const cookie = await login()
  expect((await call(env, '/me', { cookie })).headers.get('set-cookie')).toBeNull()
  d1.exec('UPDATE sessions SET expires_at = ?', Date.now() + 10 * 86_400_000)
  const renewed = await call(env, '/me', { cookie })
  expect(renewed.headers.get('set-cookie')).toContain(`Max-Age=${LIMITS.sessionDays * 86400}`)
  const exp = d1.prepare('SELECT expires_at AS e FROM sessions').first<{ e: number }>()!.e
  expect(exp).toBeGreaterThan(Date.now() + 179 * 86_400_000)
})

it('dopo un ripristino il telefono con il cursore avanti riparte da zero', async () => {
  const { env, d1, login } = await session()
  const cookie = await login()
  expect((await push(env, cookie, [{ kind: 'bikes', id: BIKE, data: bike(), updatedAt: AT }])).status).toBe(200)
  d1.exec("UPDATE users SET rev = 1 WHERE id = '42'")
  const page = (await (await call(env, '/sync/pull?since=40', { cookie })).json()) as { cursor: number; more: boolean }
  expect(page).toMatchObject({ cursor: 0, more: true })
})

it('esportare i dati ha un tetto orario', async () => {
  const { env, login } = await session()
  const cookie = await login()
  for (let i = 0; i < RATE.export.max; i++) expect((await call(env, '/account/export', { cookie })).status).toBe(200)
  expect((await call(env, '/account/export', { cookie })).status).toBe(429)
})
