import { gunzipSync } from 'node:zlib'
import { expect, it } from 'vitest'
import { FakeD1, FakeR2 } from '../server/testing/cloud'
import { runBackup, type BackupEnv } from './backup'

it('salva una copia compressa del database e tiene solo le ultime 5 settimane', async () => {
  const DB = new FakeD1()
  const BACKUPS = new FakeR2()
  DB.exec("INSERT INTO users(id, email, created_at) VALUES ('42', 'a@b.it', 0)")
  DB.exec("INSERT INTO sessions(token_hash, user_id, expires_at) VALUES ('segreto', '42', 9)")
  for (let i = 0; i < 1203; i++)
    DB.exec("INSERT INTO records(user_id, kind, id, data, updated_at, device_id, rev) VALUES ('42', 'readings', ?, '{}', 1, 'd', 1)", `r${i}`)
  await BACKUPS.put('d1/revkeeper-2026-10-10.json.gz', 'vecchio')
  await BACKUPS.put('d1/revkeeper-2026-11-20.json.gz', 'recente')
  const env = { DB, BACKUPS, FILES: new FakeR2() } as unknown as BackupEnv

  const out = await runBackup(env, new Date('2026-11-25T02:30:00Z'))
  expect(out.key).toBe('d1/revkeeper-2026-11-25.json.gz')
  expect(out.deleted).toEqual(['d1/revkeeper-2026-10-10.json.gz'])
  expect([...BACKUPS.objects.keys()].sort()).toEqual(['d1/revkeeper-2026-11-20.json.gz', 'd1/revkeeper-2026-11-25.json.gz'])

  const saved = JSON.parse(gunzipSync(BACKUPS.objects.get(out.key)!.body).toString()) as { tables: Record<string, { id?: string }[]> }
  expect(saved.tables.records).toHaveLength(1203) // più pagine da 1000
  expect(saved.tables.users).toEqual([expect.objectContaining({ id: '42', email: 'a@b.it' })])
  expect(saved.tables.sessions).toBeUndefined() // i token di sessione non finiscono nelle copie
  expect(JSON.stringify(saved)).not.toContain('_rowid')
})

it('copia i file caricati nella settimana e li tiene 30 giorni', async () => {
  const DB = new FakeD1()
  const BACKUPS = new FakeR2()
  const FILES = new FakeR2()
  const now = new Date('2026-11-29T02:30:00Z')
  FILES.now = () => new Date('2026-11-01T10:00:00Z')
  await FILES.put('42/vecchio', 'v', { httpMetadata: { contentType: 'image/jpeg' } })
  FILES.now = () => new Date('2026-11-27T10:00:00Z')
  await FILES.put('42/nuovo', 'n', { httpMetadata: { contentType: 'application/pdf' } })
  await BACKUPS.put('files/2026-10-20/42/scaduto', 'x')
  await BACKUPS.put('files/2026-11-08/42/tenuto', 'y')
  const out = await runBackup({ DB, BACKUPS, FILES } as unknown as BackupEnv, now)
  expect(out.files).toBe(1)
  expect(BACKUPS.objects.get('files/2026-11-29/42/nuovo')?.type).toBe('application/pdf')
  expect(BACKUPS.objects.has('files/2026-11-29/42/vecchio')).toBe(false)
  expect(out.deleted).toEqual(['files/2026-10-20/42/scaduto'])
})
