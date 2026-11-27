import { beforeEach, expect, it, vi } from 'vitest'

vi.mock('../server/push', () => ({ sendPush: vi.fn(async () => 201) }))

import { sendPush, type PushEnv } from '../server/push'
import { FakeD1 } from '../server/testing/cloud'
import { CATCH_UP_HOURS, MAX_SENDS, runReminders } from './worker'

const bike = JSON.stringify({ id: 'b', updatedAt: 0, make: 'Kawasaki', model: 'Z650', year: 2017, startKm: 30000, startDate: '2026-01-01' })
const doc = (due: string) => JSON.stringify({ id: 'd', updatedAt: 0, bikeId: 'b', kind: 'revisione', dueDate: due, attachmentIds: [] })
const NOW = new Date('2026-11-20T23:30:00Z') // 00:00 a Roma, 18:30 a New York

const setup = () => {
  const DB = new FakeD1()
  const env = { DB, VAPID_PUBLIC_KEY: 'p', VAPID_PRIVATE_KEY: 's', VAPID_SUBJECT: 'https://revkeeper.pages.dev' } as unknown as PushEnv
  return { DB, env }
}

const addUser = (db: FakeD1, id: string, tz: string, hour: number, due = '2026-11-28') => {
  db.exec('INSERT INTO users(id, email, created_at, notify_hour, tz) VALUES (?, ?, 0, ?, ?)', id, `${id}@x.it`, hour, tz)
  db.exec('INSERT INTO push_subs(endpoint, user_id, p256dh, auth) VALUES (?, ?, ?, ?)', `https://push.example/${id}`, id, 'k', 'a')
  db.exec("INSERT INTO records(user_id, kind, id, data, updated_at, device_id, deleted, rev) VALUES (?, 'bikes', 'b', ?, 1, 'dev', 0, 1)", id, bike)
  db.exec("INSERT INTO records(user_id, kind, id, data, updated_at, device_id, deleted, rev) VALUES (?, 'documents', 'd', ?, 1, 'dev', 0, 1)", id, doc(due))
}

const sent = () => vi.mocked(sendPush).mock.calls.map((c) => (c[1] as { endpoint: string }).endpoint)

beforeEach(() => vi.clearAllMocks())

it('un record illeggibile non blocca gli altri utenti', async () => {
  const { DB, env } = setup()
  const err = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  try {
    addUser(DB, 'rotto', 'Europe/Rome', 0)
    DB.exec("INSERT INTO records(user_id, kind, id, data, updated_at, device_id, deleted, rev) VALUES ('rotto', 'items', 'x', '{', 1, 'dev', 0, 1)")
    DB.exec('INSERT INTO records(user_id, kind, id, data, updated_at, device_id, deleted, rev) VALUES (?, ?, ?, NULL, 1, ?, 0, 1)', 'rotto', 'readings', 'n', 'dev')
    addUser(DB, 'sano', 'Europe/Rome', 0)
    await runReminders(env, NOW)
    expect(sent().sort()).toEqual(['https://push.example/rotto', 'https://push.example/sano'])
    expect(err).toHaveBeenCalled()
  } finally {
    err.mockRestore()
  }
})

it('oltre il tetto orario gli esclusi passano davanti al giro successivo', async () => {
  const { DB, env } = setup()
  const n = MAX_SENDS + 5
  for (let i = 0; i < n; i++) addUser(DB, `u${String(i).padStart(2, '0')}`, 'Europe/Rome', 0)
  await runReminders(env, NOW)
  expect(sent()).toEqual(Array.from({ length: MAX_SENDS }, (_, i) => `https://push.example/u${String(i).padStart(2, '0')}`))
  const first = DB.prepare('SELECT last_reminded_at AS t FROM users WHERE id = ?').bind('u00').first<{ t: number | null }>()
  const later = DB.prepare('SELECT last_reminded_at AS t FROM users WHERE id = ?').bind('u40').first<{ t: number | null }>()
  expect(first?.t).toBe(NOW.getTime())
  expect(later?.t).toBeNull()

  vi.mocked(sendPush).mockClear()
  await runReminders(env, NOW)
  expect(sent().slice(0, 5)).toEqual(['https://push.example/u40', 'https://push.example/u41', 'https://push.example/u42', 'https://push.example/u43', 'https://push.example/u44'])
})

it("avvisa solo chi ha quell'ora nel proprio fuso", async () => {
  const { DB, env } = setup()
  addUser(DB, 'roma', 'Europe/Rome', 0, '2026-11-28')
  addUser(DB, 'roma-dopo', 'Europe/Rome', 9, '2026-11-28')
  addUser(DB, 'ny', 'America/New_York', 18, '2026-11-27')
  addUser(DB, 'ny-notte', 'America/New_York', 0, '2026-11-27')
  await runReminders(env, NOW)
  expect(sent().sort()).toEqual(['https://push.example/ny', 'https://push.example/roma'])
  const skipped = DB.prepare('SELECT last_reminded_at AS t FROM users WHERE id = ?').bind('roma-dopo').first<{ t: number | null }>()
  expect(skipped?.t).toBeNull()
})

it("chi resta fuori per il tetto viene avvisato all'ora dopo, gli altri non due volte", async () => {
  const { DB, env } = setup()
  const n = MAX_SENDS + 5
  for (let i = 0; i < n; i++) addUser(DB, `u${String(i).padStart(2, '0')}`, 'Europe/Rome', 0)
  await runReminders(env, NOW)
  vi.mocked(sendPush).mockClear()
  await runReminders(env, new Date(NOW.getTime() + 3600_000)) // 01:00 a Roma
  expect(sent()).toEqual(['https://push.example/u40', 'https://push.example/u41', 'https://push.example/u42', 'https://push.example/u43', 'https://push.example/u44'])
  vi.mocked(sendPush).mockClear()
  await runReminders(env, new Date(NOW.getTime() + 2 * 3600_000))
  expect(sent()).toEqual([])
})

it('un giro del cron saltato non fa perdere il promemoria del giorno', async () => {
  const { DB, env } = setup()
  addUser(DB, 'roma', 'Europe/Rome', 0)
  await runReminders(env, new Date(NOW.getTime() + 2 * 3600_000)) // il giro delle 00:00 non è partito
  expect(sent()).toEqual(['https://push.example/roma'])
  vi.mocked(sendPush).mockClear()
  await runReminders(env, new Date(NOW.getTime() + CATCH_UP_HOURS * 3600_000 + 3600_000))
  expect(sent()).toEqual([])
})

it('dopo il giro il prossimo promemoria è il giorno dopo alla stessa ora', async () => {
  const { DB, env } = setup()
  addUser(DB, 'roma', 'Europe/Rome', 0)
  await runReminders(env, NOW)
  const r = DB.prepare('SELECT remind_at AS t FROM users WHERE id = ?').bind('roma').first<{ t: number }>()
  expect(new Date(r!.t).toISOString()).toBe('2026-11-21T23:00:00.000Z') // 00:00 del 22 a Roma
  vi.mocked(sendPush).mockClear()
  await runReminders(env, new Date(NOW.getTime() + 3600_000))
  expect(sent()).toEqual([]) // non più in scadenza: il giro non lo rilegge
})
