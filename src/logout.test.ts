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

it("su 401 dal server cancella i dati locali e avvisa l'app per tornare al login", async () => {
  const store = new Map<string, string>([
    ['revkeeper.theme', 'dark'],
    ['revkeeper.epoch', '2026-11-25'],
    ['revkeeper.welcomed', '1'],
    ['revkeeper.activeBike', 'b1'],
  ])
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  })
  vi.stubGlobal('navigator', { onLine: true })
  const events: string[] = []
  vi.stubGlobal('dispatchEvent', (e: Event) => events.push(e.type) > 0)

  await setMeta('account', 'a@example.com')
  await save('bikes', { make: 'Vespa', model: 'GTS 300', year: 2021, startKm: 100, startDate: '2021-05-01' })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"error":"Non autenticato"}', { status: 401 })))

  await expect(syncNow()).rejects.toBeInstanceOf(LoggedOut)
  expect(await listBikes()).toHaveLength(0)
  expect(await getMeta('account')).toBeUndefined()
  expect(await unsynced()).toBe(0)
  expect(store.get('revkeeper.welcomed')).toBeUndefined()
  expect(store.get('revkeeper.activeBike')).toBeUndefined()
  expect(store.get('revkeeper.theme')).toBe('dark')
  expect(store.get('revkeeper.epoch')).toBe('2026-11-25')
  expect(events).toContain('revkeeper:loggedout')
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
