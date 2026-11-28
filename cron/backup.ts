/// <reference types="@cloudflare/workers-types" />
// Copia settimanale su R2 (bucket revkeeper-backups, UE): il database in un JSON compresso, tenuto 5 settimane,
// e i file degli utenti caricati nella settimana, tenuti 30 giorni. Il ripristino quotidiano lo fa D1 Time Travel.
// Le sessioni e i contatori dei limiti non servono a ripartire e restano fuori. Procedura: RIPRISTINO.md.
export const BACKUP_TABLES = ['users', 'records', 'files', 'push_subs'] as const
export const KEEP_DAYS = 35
export const FILE_KEEP_DAYS = 30
// shortcut: copia in un solo giro; quando il database o i file della settimana superano i limiti di CPU/tempo, dividere per tabella o per pagine su più giri
const MAX_FILES = 300
const PAGE = 1000
export const WARN_ROWS = 50_000

export type BackupEnv = { DB: D1Database; BACKUPS: R2Bucket; FILES: R2Bucket }

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
  // La copia sta in memoria in un solo giro: oltre questa soglia avvisa, prima che CPU (10 ms) o memoria (128 MB) la fermino
  const total = Object.values(dump).reduce((n, r) => n + r.length, 0)
  if (total > WARN_ROWS) console.error(`Copia settimanale: ${total} righe, vicina al limite di un solo giro. Dividerla su più giri o passare a Workers Paid`)
  const key = `d1/revkeeper-${day}.json.gz`
  const body = await gzip(JSON.stringify({ createdAt: now.toISOString(), tables: dump }))
  await env.BACKUPS.put(key, body, { httpMetadata: { contentType: 'application/json', contentEncoding: 'gzip' } })

  // File degli utenti caricati negli ultimi 8 giorni (un giorno di sovrapposizione se un giro slitta)
  const since = now.getTime() - 8 * 86_400_000
  let copied = 0
  for (let cursor: string | undefined; copied < MAX_FILES; ) {
    const page = await env.FILES.list({ cursor, include: ['httpMetadata'] })
    for (const o of page.objects) {
      if (o.uploaded.getTime() < since || copied >= MAX_FILES) continue
      const obj = await env.FILES.get(o.key)
      if (!obj) continue
      await env.BACKUPS.put(`files/${day}/${o.key}`, obj.body, { httpMetadata: obj.httpMetadata })
      copied++
    }
    if (!page.truncated) break
    cursor = page.cursor
  }
  if (copied >= MAX_FILES) console.error(`Copia file interrotta a ${MAX_FILES}: gli altri restano senza copia questa settimana`)

  // Pulizia: database oltre 5 settimane, file oltre 30 giorni
  const stale: string[] = []
  for (const [prefix, days] of [['d1/', KEEP_DAYS], ['files/', FILE_KEEP_DAYS]] as const) {
    const oldest = new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10)
    for (let cursor: string | undefined; ; ) {
      const listed = await env.BACKUPS.list({ prefix, cursor })
      stale.push(...listed.objects.map((o) => o.key).filter((k) => (/(\d{4}-\d{2}-\d{2})/.exec(k)?.[1] ?? day) < oldest))
      if (!listed.truncated) break
      cursor = listed.cursor
    }
  }
  for (let i = 0; i < stale.length; i += 1000) await env.BACKUPS.delete(stale.slice(i, i + 1000))
  return { key, bytes: body.byteLength, rows: Object.fromEntries(Object.entries(dump).map(([t, r]) => [t, r.length])), files: copied, deleted: stale }
}
