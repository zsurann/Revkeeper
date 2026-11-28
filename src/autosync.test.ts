import 'fake-indexeddb/auto'
import { afterEach, expect, it, vi } from 'vitest'
import { setMeta } from './db'

afterEach(() => vi.unstubAllGlobals())

it('dopo un errore del server il sync riprova da solo, con attesa crescente', async () => {
  const timers: [() => void, number][] = []
  const realTimeout = globalThis.setTimeout
  vi.stubGlobal('setTimeout', ((fn: () => void, ms: number) => (ms >= 30_000 ? (timers.push([fn, ms]), 0) : realTimeout(fn, ms))) as never)
  vi.stubGlobal('navigator', { onLine: true })
  vi.stubGlobal('dispatchEvent', () => true)
  vi.stubGlobal('addEventListener', () => undefined)
  vi.stubGlobal('document', { addEventListener: () => undefined, visibilityState: 'visible' })
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  await setMeta('account', 'a@example.com')
  let calls = 0
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.startsWith('/api/sync/pull')) calls++
    if (calls === 1 && url.startsWith('/api/sync/pull')) return new Response('{"error":"Errore del server"}', { status: 500 })
    return new Response(JSON.stringify({ changes: [], cursor: 0, more: false }))
  }))
  const { startAutoSync } = await import('./sync')
  startAutoSync()
  await vi.waitFor(() => expect(timers).toHaveLength(1))
  expect(calls).toBe(1)
  expect(timers[0]![1]).toBe(30_000) // primo tentativo dopo 30 s
  timers[0]![0]()
  await vi.waitFor(() => expect(calls).toBe(2))
})
