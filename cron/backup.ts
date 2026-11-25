/// <reference types="@cloudflare/workers-types" />
// Copia notturna del database su R2 (bucket revkeeper-backups, UE): un file JSON compresso al giorno,
// tenuto 7 giorni. Le sessioni e i contatori dei limiti non servono a ripartire e restano fuori.
export const BACKUP_TABLES = ['users', 'records', 'files', 'push_subs'] as const
export const KEEP_DAYS = 7
const PAGE = 1000

export type BackupEnv = { DB: D1Database; BACKUPS: R2Bucket }

const gzip = async (text: string) => {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

export const runBackup = async (env: BackupEnv, now: Date) => {
  const day = now.toISOString().slice(0, 10)
  const dump: Record<string, unknown[]> = {}
  for (const table of BACKUP_TABLES) {
    const rows: unknown[] = []
    for (let last = 0; ; ) {
      // rowid: pagine stabili anche con chiavi primarie di testo
      const { results } = await env.DB.prepare(`SELECT rowid AS _rowid, * FROM ${table} WHERE rowid > ? ORDER BY rowid LIMIT ?`).bind(last, PAGE).all<{ _rowid: number }>()
      rows.push(...results.map(({ _rowid, ...r }) => r))
      if (results.length < PAGE) break
      last = results.at(-1)!._rowid
    }
    dump[table] = rows
  }
  const key = `d1/revkeeper-${day}.json.gz`
  const body = await gzip(JSON.stringify({ createdAt: now.toISOString(), tables: dump }))
  await env.BACKUPS.put(key, body, { httpMetadata: { contentType: 'application/json', contentEncoding: 'gzip' } })

  // Pulizia: via le copie più vecchie di 7 giorni
  const oldest = new Date(now.getTime() - KEEP_DAYS * 86_400_000).toISOString().slice(0, 10)
  const listed = await env.BACKUPS.list({ prefix: 'd1/' })
  const stale = listed.objects.map((o) => o.key).filter((k) => (/revkeeper-(\d{4}-\d{2}-\d{2})/.exec(k)?.[1] ?? day) < oldest)
  if (stale.length) await env.BACKUPS.delete(stale)
  return { key, bytes: body.byteLength, rows: Object.fromEntries(Object.entries(dump).map(([t, r]) => [t, r.length])), deleted: stale }
}
