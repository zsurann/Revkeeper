import { gunzipSync } from 'node:zlib'
import { expect, it } from 'vitest'
import { FakeD1, FakeR2 } from '../server/testing/cloud'
import { runBackup, type BackupEnv } from './backup'

it('salva una copia compressa del database e tiene solo gli ultimi 7 giorni', async () => {
  const DB = new FakeD1()
  const BACKUPS = new FakeR2()
  DB.exec("INSERT INTO users(id, email, created_at) VALUES ('42', 'a@b.it', 0)")
  DB.exec("INSERT INTO sessions(token_hash, user_id, expires_at) VALUES ('segreto', '42', 9)")
  for (let i = 0; i < 1203; i++)
    DB.exec("INSERT INTO records(user_id, kind, id, data, updated_at, device_id, rev) VALUES ('42', 'readings', ?, '{}', 1, 'd', 1)", `r${i}`)
  await BACKUPS.put('d1/revkeeper-2026-11-10.json.gz', 'vecchio')
  await BACKUPS.put('d1/revkeeper-2026-11-20.json.gz', 'recente')
  const env = { DB, BACKUPS } as unknown as BackupEnv

  const out = await runBackup(env, new Date('2026-11-25T02:30:00Z'))
  expect(out.key).toBe('d1/revkeeper-2026-11-25.json.gz')
  expect(out.deleted).toEqual(['d1/revkeeper-2026-11-10.json.gz'])
  expect([...BACKUPS.objects.keys()].sort()).toEqual(['d1/revkeeper-2026-11-20.json.gz', 'd1/revkeeper-2026-11-25.json.gz'])

  const saved = JSON.parse(gunzipSync(BACKUPS.objects.get(out.key)!.body).toString()) as { tables: Record<string, { id?: string }[]> }
  expect(saved.tables.records).toHaveLength(1203) // più pagine da 1000
  expect(saved.tables.users).toEqual([expect.objectContaining({ id: '42', email: 'a@b.it' })])
  expect(saved.tables.sessions).toBeUndefined() // i token di sessione non finiscono nelle copie
  expect(JSON.stringify(saved)).not.toContain('_rowid')
})
