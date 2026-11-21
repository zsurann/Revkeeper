// Scarica un libretto PDF ufficiale in .cache/manuals/ (fuori dal repo) e indica le pagine col piano di manutenzione.
//   node scripts/manuals/fetch-manual.ts <url> [out-dir]      (out-dir di default: .cache/manuals)
// Richiede poppler-utils (pdftotext); se manca: apt-get install -y poppler-utils.
// I PDF sono coperti da copyright: non vanno mai committati, se ne estraggono solo i numeri (vedi issues/research/302).
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'

const [url, outDir = '.cache/manuals'] = process.argv.slice(2)
if (!url || !/^https:\/\//.test(url)) {
  console.error('uso: node scripts/manuals/fetch-manual.ts <https-url-del-pdf> [out-dir]')
  process.exit(1)
}
mkdirSync(outDir, { recursive: true })
const name = decodeURIComponent(basename(new URL(url).pathname)).replace(/[^\w.-]+/g, '_').replace(/\.pdf$/i, '')
const pdf = join(outDir, `${name}.pdf`)
const txt = join(outDir, `${name}.txt`)

if (existsSync(pdf) && statSync(pdf).size > 0) console.error(`già in cache: ${pdf}`)
else {
  // Un solo GET con User-Agent dichiarato: niente crawling, si scarica solo ciò che si chiede
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (manual-fetch; personal use)' } })
  if (!res.ok) throw new Error(`HTTP ${res.status} per ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.subarray(0, 5).toString() !== '%PDF-') throw new Error(`non è un PDF: ${url}`)
  writeFileSync(pdf, buf)
  console.error(`scaricato: ${pdf} (${buf.length} byte)`)
}

if (!existsSync(txt)) execFileSync('pdftotext', ['-q', '-layout', pdf, txt])
// pdftotext separa le pagine con il form feed
const pages = readFileSync(txt, 'utf8').split('\f')

const KEYWORDS = [/manutenzione periodica/i, /programma di manutenzione/i, /tabella (di|della) manutenzione/i,
  /periodic maintenance/i, /maintenance schedule/i, /\bkm\b/i, /\bmesi\b/i]
const scored = pages.map((text, i) => {
  const hits = KEYWORDS.filter((re) => re.test(text)).length
  const kmCols = (text.match(/\d{1,3}[ .,]?000\s?km|\d{1,3}[ .,]?000\b/g) ?? []).length // densità di colonne "N 000 km"
  return { page: i + 1, hits, kmCols, score: hits * 3 + Math.min(kmCols, 30) }
}).filter((p) => p.hits >= 2 || (p.hits >= 1 && p.kmCols >= 5)) // le pagine di seguito hanno solo "km" e i numeri

console.log(`${pdf}: ${pages.length - 1} pagine, testo in ${txt}`)
for (const p of scored.sort((a, b) => b.score - a.score).slice(0, 12).sort((a, b) => a.page - b.page))
  console.log(`  pag. PDF ${p.page}  parole chiave ${p.hits}  numeri-km ${p.kmCols}`)
console.log(`immagine di una pagina: pdftoppm -f N -l N -r 110 -png ${pdf} ${join(outDir, name)}`)
