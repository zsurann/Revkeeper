import 'fake-indexeddb/auto'
import { afterEach, expect, it, vi } from 'vitest'
import { getMeta, listBikes, save, setMeta } from './db'
import { LoggedOut, logout, syncNow, unsynced } from './sync'

afterEach(() => vi.unstubAllGlobals())

it("uscendo senza rete non si cancella nulla; con la rete i dati locali spariscono", async () => {
  await setMeta('account', 'a@example.com')
  await save('bikes', { make: 'Vespa', model: 'GTS 300', year: 2021, startKm: 100, startDate: '2021-05-01' })
  expect(await unsynced()).toBe(1)

  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
  await expect(logout()).rejects.toThrow()
  expect(await listBikes()).toHaveLength(1)

  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')))
  await logout()
  expect(await listBikes()).toHaveLength(0)
  expect(await getMeta('account')).toBeUndefined()
  expect(await unsynced()).toBe(0)
})

it("su 401 dal server i dati restano sul telefono, comprese le modifiche non inviate", async () => {
  vi.stubGlobal('navigator', { onLine: true })
  const events: string[] = []
  vi.stubGlobal('dispatchEvent', (e: Event) => events.push(e.type) > 0)

  await setMeta('account', 'a@example.com')
  await save('bikes', { make: 'Vespa', model: 'GTS 300', year: 2021, startKm: 100, startDate: '2021-05-01' })
  const pending = await unsynced()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"error":"Non autenticato"}', { status: 401 })))

  await expect(syncNow()).rejects.toBeInstanceOf(LoggedOut)
  expect((await listBikes()).length).toBeGreaterThan(0)
  expect(await unsynced()).toBe(pending)
  expect(await getMeta('account')).toBeUndefined()
  expect(events).toContain('revkeeper:loggedout')
})

it("ospite: gli allegati non partono; al login Google si caricano anche quelli segnati come già online", async () => {
  vi.stubGlobal('navigator', { onLine: true })
  vi.stubGlobal('dispatchEvent', () => true)
  await setMeta('account', undefined)
  await setMeta('guest', true)
  const att = await save('attachments', { name: 'foto.jpg', type: 'image/jpeg', size: 3, blob: new Blob(['abc']), uploaded: 1 } as never)
  const calls: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push(`${init?.method ?? 'GET'} ${url}`)
    if (url.startsWith('/api/sync/pull')) return new Response(JSON.stringify({ changes: [], cursor: 1, more: false }))
    return new Response('{"ok":true}')
  }))
  await syncNow()
  expect(calls.some((c) => c.includes('/api/files/'))).toBe(false)

  const { startAccount } = await import('./sync')
  await startAccount('a@example.com')
  expect(calls).toContain(`PUT /api/files/${(att as { id: string }).id}`)
})

it('un allegato rifiutato dal server non blocca il resto della sincronizzazione', async () => {
  vi.stubGlobal('navigator', { onLine: true })
  vi.stubGlobal('dispatchEvent', () => true)
  await setMeta('account', 'a@example.com')
  await save('bikes', { make: 'Vespa', model: 'GTS 300', year: 2021, startKm: 100, startDate: '2021-05-01' })
  await save('attachments', { name: 'enorme.pdf', type: 'application/pdf', size: 3, blob: new Blob(['abc']) } as never)
  const calls: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push(`${init?.method ?? 'GET'} ${url}`)
    if (url.startsWith('/api/files/')) return new Response('{"error":"Spazio online esaurito (500 MB)"}', { status: 507 })
    if (url.startsWith('/api/sync/pull')) return new Response(JSON.stringify({ changes: [], cursor: 7, more: false }))
    return new Response('{"ok":true}')
  }))
  await expect(syncNow()).rejects.toThrow('Spazio online esaurito')
  expect(calls.some((c) => c.startsWith('GET /api/sync/pull'))).toBe(true) // si scaricano comunque le modifiche degli altri
  expect(await getMeta('cursor')).toBe(7)
  expect(await unsynced()).toBe(1) // resta da inviare solo l'allegato rifiutato
})

it('ospite scaduto (401): i dati restano sul telefono e l\'app rinnova le notifiche', async () => {
  vi.stubGlobal('navigator', { onLine: true })
  const events: string[] = []
  vi.stubGlobal('dispatchEvent', (e: Event) => events.push(e.type) > 0)
  await setMeta('account', undefined)
  await setMeta('guest', true)
  await save('bikes', { make: 'Ducati', model: 'Monster', year: 2022, startKm: 10, startDate: '2022-05-01' })
  const before = (await listBikes()).length
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"error":"Non autenticato"}', { status: 401 })))

  expect(await syncNow()).toBe(0)
  expect(await listBikes()).toHaveLength(before)
  expect(await getMeta('guest')).toBe(false)
  expect(events).toContain('revkeeper:guestexpired')
  expect(events).not.toContain('revkeeper:loggedout')
})
