import { expect, it } from 'vitest'
import { FakeD1 } from './testing/cloud'
import { hit, ipKey } from './ratelimit'

it('IPv6 conta per /64, IPv4 per indirizzo', () => {
  expect(ipKey('203.0.113.9')).toBe('203.0.113.9')
  expect(ipKey('2a01:4f8:c17:1a2b::1')).toBe('2a01:4f8:c17:1a2b::/64')
  expect(ipKey('2a01:04f8:0c17:1a2b:aaaa:bbbb:cccc:dddd')).toBe('2a01:4f8:c17:1a2b::/64')
  expect(ipKey('2001:db8::5')).toBe('2001:db8:0:0::/64')
  expect(ipKey('::1')).toBe('0:0:0:0::/64')
})

it('la finestra successiva riparte da zero', async () => {
  const db = new FakeD1() as unknown as D1Database
  const t = Date.UTC(2026, 10, 25, 10, 0, 0)
  for (let i = 0; i < 5; i++) expect((await hit(db, 'pushTest', 'u', t)).ok).toBe(true)
  const over = await hit(db, 'pushTest', 'u', t + 60_000)
  expect(over).toEqual({ ok: false, retryAfter: 3540 })
  expect((await hit(db, 'pushTest', 'u', t + 3_600_000)).ok).toBe(true)
})
