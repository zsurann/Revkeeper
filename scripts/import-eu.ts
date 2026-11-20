// Importa le moto dai registri aperti europei e scrive data/eu-models.json, poi lo usa build-catalog.ts.
//   node scripts/import-eu.ts
// Fonti: Traficom (Finlandia, CC BY 4.0) e DGT (Spagna, microdati mensili, riuso citando la fonte).
// I file scaricati restano in .cache/ (fuori dal repo).
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { display, groupModels, type RegRow } from '../src/domain/euImport.ts'

const CACHE = '.cache'
mkdirSync(CACHE, { recursive: true })
const fetchTo = (url: string, file: string) => {
  if (!existsSync(file)) execSync(`curl -sfL -o ${file} "${url}"`, { stdio: 'inherit' })
  return existsSync(file)
}

// Marche come le mostra l'app; le altre prendono il nome in forma leggibile
const BRAND_ALIAS: Record<string, string> = {
  BMW: 'BMW', KTM: 'KTM', SYM: 'SYM', SANYANG: 'SYM', CFMOTO: 'CFMoto', 'CF MOTO': 'CFMoto', NIU: 'NIU', SWM: 'SWM', MASH: 'Mash',
  'HARLEY DAVIDSON': 'Harley-Davidson', 'HARLEY-DAVIDSON': 'Harley-Davidson', 'MV AGUSTA': 'MV Agusta', 'MV-AGUSTA': 'MV Agusta',
  'MOTO GUZZI': 'Moto Guzzi', GUZZI: 'Moto Guzzi', 'MOTO MORINI': 'Moto Morini', 'ROYAL ENFIELD': 'Royal Enfield', GASGAS: 'GasGas', 'GAS GAS': 'GasGas',
  'INDIAN MOTORCYCLE': 'Indian', ZERO: 'Zero Motorcycles', 'ZERO MOTORCYCLES': 'Zero Motorcycles', 'JAWA-CZ': 'Jawa',
}
const brand = (raw: string) => {
  const up = raw.trim().toUpperCase().replace(/\s+/g, ' ')
  return BRAND_ALIAS[up] ?? display(up)
}
// Le Vespa sono registrate come Piaggio "VESPA GTS": nell'app Vespa è una marca a sé
const splitVespa = (make: string, name: string) =>
  make === 'Piaggio' && /^VESPA\s/i.test(name) ? { make: 'Vespa', name: name.replace(/^VESPA\s+/i, '') } : { make, name }

const rows: RegRow[] = []
const push = (src: RegRow['src'], rawMake: string, name: string, year: number, cc: number, kw: number, kg: number) => {
  const v = splitVespa(brand(rawMake), name.trim())
  rows.push({ src, make: v.make, name: v.name, year, cc, kw, kg })
}

// Traficom: un CSV da ~1 GB dentro lo zip, letto in streaming; solo classi L1/L3 (moto e ciclomotori a due ruote)
const TRAFICOM = `${CACHE}/traficom.zip`
if (fetchTo('https://opendata.traficom.fi/Content/Ajoneuvorekisteri.zip', TRAFICOM)) {
  const tsv = execSync(
    `unzip -p ${TRAFICOM} | iconv -f latin1 -t utf8 | awk -F';' 'NR>1 && $1 ~ /^L(1|3|1e|3e)$/ && $30!="" {y=substr($7,1,4); if(y=="") y=substr($2,1,4); print y"\\t"$26"\\t"$30"\\t"$20"\\t"$21"\\t"$13}'`,
    { maxBuffer: 1 << 30 },
  ).toString()
  for (const l of tsv.split('\n')) {
    const [y, make, name, cc, kw, kg] = l.split('\t')
    if (make && name) push('traficom', make, name, Number(y), Number(cc), Number(kw), Number(kg))
  }
}

// DGT: file mensili a larghezza fissa; posizioni tarate su un campione (vedi issue 305). Posti = 2 → moto/scooter.
const now = new Date()
for (let i = 1; i <= 12; i++) {
  const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
  const file = `${CACHE}/dgt_${ym}.zip`
  if (!fetchTo(`https://www.dgt.es/microdatos/salida/${d.getFullYear()}/${d.getMonth() + 1}/vehiculos/matriculaciones/export_mensual_mat_${ym}.zip`, file)) continue
  for (const l of execSync(`unzip -p ${file} | iconv -f latin1 -t utf8`, { maxBuffer: 1 << 30 }).toString().split('\n')) {
    if (l.slice(236, 239).trim() !== '2') continue
    push('dgt', l.slice(17, 47), l.slice(47, 69), Number(l.slice(4, 8)), Number(l.slice(94, 100)), Number(l.slice(224, 235)), Number(l.slice(105, 111)))
  }
}

// Marche con almeno 50 veicoli: le altre sono importatori minori o errori di battitura
const perBrand = new Map<string, number>()
for (const r of rows) perBrand.set(r.make, (perBrand.get(r.make) ?? 0) + 1)
// DGT mescola alle moto le auto a 2 posti (Smart, Alpine, Z4…)
const motoBrands = new Set(rows.filter((r) => r.src === 'traficom').map((r) => r.make))
// con la massa si decide da quella (≤ 400 kg); senza, vale solo per marche già note come moto
const isMoto = (r: RegRow) => r.src === 'traficom' || (r.kg > 0 ? r.kg <= 400 : motoBrands.has(r.make) && r.kw <= 150)
// Nomi che sono codici di omologazione ("50 ET4-C26100/50") o vuoti ("---")
const goodName = (n: string) => /[A-Za-z0-9]/.test(n) && !n.includes('/')
const models = groupModels(
  rows.filter((r) => (perBrand.get(r.make) ?? 0) >= 50 && Number.isFinite(r.cc) && Number.isFinite(r.kw) && isMoto(r) && goodName(r.name)),
)
// Stesso nome in epoche diverse: il modello più vecchio prende l'anno nel nome ("Z650 (1977)")
const byKey = new Map<string, number>()
for (const m of models) byKey.set(`${m.make}|${m.key}`, Math.max(byKey.get(`${m.make}|${m.key}`) ?? 0, m.from))
for (const m of models) if (m.from < byKey.get(`${m.make}|${m.key}`)!) m.model = `${m.model} (${m.from})`

writeFileSync('data/eu-models.json', JSON.stringify(models) + '\n')
console.error(`${rows.length} veicoli → ${models.length} modelli di ${new Set(models.map((m) => m.make)).size} marche`)
