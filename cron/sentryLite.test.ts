import { expect, it, vi } from 'vitest'
import { envelopeFor, monitored } from './sentryLite'

const DSN = 'https://chiave@o1.ingest.de.sentry.io/123'
const M = { slug: 'revkeeper-cron', schedule: '0 * * * *', failureIssueThreshold: 2 }

it('check-in e riepilogo errori in un solo envelope', () => {
  const { url, body } = envelopeFor(DSN, M, 'ok', ['Fuso non valido per u1'], 1500, 'production', 'v1')
  expect(url).toBe('https://o1.ingest.de.sentry.io/api/123/envelope/?sentry_key=chiave&sentry_version=7')
  const lines = body.split('\n').map((l) => JSON.parse(l))
  expect(lines[1]).toEqual({ type: 'check_in' })
  expect(lines[2]).toMatchObject({ monitor_slug: 'revkeeper-cron', status: 'ok', duration: 1.5, monitor_config: { schedule: { value: '0 * * * *' } } })
  expect(lines[3]).toEqual({ type: 'event' })
  expect(lines[4].message.formatted).toContain('Fuso non valido per u1')
})

it("un'eccezione chiude il check-in con errore e viene rilanciata", async () => {
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null))
  const err = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  await expect(monitored({ SENTRY_DSN: DSN }, M, async () => { throw new Error('rotto') })).rejects.toThrow('rotto')
  const body = String(fetch.mock.calls[0]![1]!.body)
  expect(body).toContain('"status":"error"')
  expect(body).toContain('Error: rotto')
  fetch.mockRestore(); err.mockRestore()
})
