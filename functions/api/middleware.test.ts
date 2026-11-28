import { expect, it, vi } from 'vitest'
import { onRequest } from './_middleware'

const ctx = (next: () => Promise<Response>, waits: Promise<unknown>[]) => ({
  request: new Request('https://revkeeper.pages.dev/api/files/33333333-3333-4333-8333-333333333333', { method: 'PUT' }),
  env: { SENTRY_DSN: 'https://key@o1.ingest.de.sentry.io/42', CF_PAGES_BRANCH: 'main' },
  next,
  waitUntil: (p: Promise<unknown>) => void waits.push(p),
}) as never

it('i console.error di una richiesta arrivano a Sentry in un solo evento, senza id nel percorso', async () => {
  const fetch = vi.fn(async () => new Response('{}'))
  vi.stubGlobal('fetch', fetch)
  const quiet = vi.spyOn(console, 'error')
  const waits: Promise<unknown>[] = []
  await onRequest(ctx(async () => { console.error(new Error('R2 giù')); console.error('secondo'); return new Response('', { status: 500 }) }, waits))
  await Promise.all(waits)
  expect(fetch).toHaveBeenCalledTimes(1)
  const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
  expect(url).toBe('https://o1.ingest.de.sentry.io/api/42/envelope/?sentry_key=key&sentry_version=7')
  expect(String(init.body)).toContain('api PUT /api/files/:id: 2 errori. Error: R2 giù | secondo')
  expect(String(init.body)).toContain('"environment":"production"')

  fetch.mockClear()
  await onRequest(ctx(async () => new Response('ok'), waits))
  expect(fetch).not.toHaveBeenCalled()
  quiet.mockRestore()
  vi.unstubAllGlobals()
})
