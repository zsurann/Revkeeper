// Ripristino di prova: backup JSON.gz -> SQLite locale con lo schema delle migrazioni
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync, rmSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
const [file, out, mig] = process.argv.slice(2)
rmSync(out, { force: true })
const db = new DatabaseSync(out)
for (const f of readdirSync(mig).sort()) db.exec(readFileSync(`${mig}/${f}`, 'utf8'))
const raw = readFileSync(file)
// Con Content-Encoding: gzip alcuni client lo scaricano già decompresso
const dump = JSON.parse((raw[0] === 0x1f && raw[1] === 0x8b ? gunzipSync(raw) : raw).toString())
const order = ['users', 'records', 'files', 'push_subs']
db.exec('BEGIN')
for (const t of order) {
  for (const row of dump.tables[t] ?? []) {
    const cols = Object.keys(row)
    db.prepare(`INSERT INTO ${t}(${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...cols.map((c) => row[c]))
  }
}
db.exec('COMMIT')
console.log('creato il', dump.createdAt)
for (const t of order) console.log(t, db.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n, 'righe')
console.log('integrity', db.prepare('PRAGMA integrity_check').get())
console.log('fk', db.prepare('PRAGMA foreign_key_check').all().length, 'violazioni')
