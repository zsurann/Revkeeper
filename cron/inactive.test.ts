import { expect, it, vi } from 'vitest'

vi.mock('../server/push', () => ({ sendPush: vi.fn(async () => 201) }))

import { sendPush } from '../server/push'
import { FakeD1, FakeR2 } from '../server/testing/cloud'
import { DELETE_AFTER, runInactive, WARN_AFTER, type InactiveEnv } from './inactive'

it('avvisa chi è inattivo da 23 mesi ed elimina dopo 24 mesi e l\'avviso', async () => {
  const DB = new FakeD1()
  const FILES = new FakeR2()
  const now = 100 * 365 * 86_400_000
  DB.exec("INSERT INTO users(id, email, created_at, seen_at) VALUES ('attivo', 'a@x.it', 0, ?)", now - 86_400_000)
  DB.exec("INSERT INTO users(id, email, created_at, seen_at) VALUES ('quasi', 'b@x.it', 0, ?)", now - WARN_AFTER - 1)
  DB.exec("INSERT INTO users(id, email, created_at, seen_at, warned_at) VALUES ('via', 'c@x.it', 0, ?, ?)", now - DELETE_AFTER - 1, now - 26 * 86_400_000)
  DB.exec("INSERT INTO users(id, email, created_at) VALUES ('guest-x', '', 0)")
  DB.exec("INSERT INTO push_subs(endpoint, user_id, p256dh, auth) VALUES ('https://fcm.googleapis.com/x', 'quasi', 'k', 'a')")
  await FILES.put('via/f', 'x')
  const env = { DB, FILES } as unknown as InactiveEnv

  expect(await runInactive(env, now)).toEqual({ warned: 1, deleted: 1 })
  expect(vi.mocked(sendPush)).toHaveBeenCalledTimes(1)
  const ids = DB.prepare('SELECT id, warned_at AS w FROM users ORDER BY id').all().results
  expect(ids).toEqual([{ id: 'attivo', w: null }, { id: 'guest-x', w: null }, { id: 'quasi', w: now }])
  expect(FILES.objects.size).toBe(0)
  // Già avvisato: la settimana dopo non riceve un secondo avviso
  expect(await runInactive(env, now + 7 * 86_400_000)).toEqual({ warned: 0, deleted: 0 })
})
