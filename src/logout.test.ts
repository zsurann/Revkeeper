import 'fake-indexeddb/auto'
import { afterEach, expect, it, vi } from 'vitest'
import { getMeta, listBikes, save, setMeta } from './db'
import { logout, unsynced } from './sync'

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
