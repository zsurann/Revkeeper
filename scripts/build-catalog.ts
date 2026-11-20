// Genera src/data/catalog.json da vPIC (NHTSA) + data/catalog-extra.json. Da rilanciare una volta l'anno:
//   node scripts/build-catalog.ts
import { readFileSync, writeFileSync } from 'node:fs'
import { buildCatalog, type Extra, type Raw } from '../src/domain/catalogBuild.ts'

// Marca mostrata nell'app → nomi usati da vPIC (alcune marche compaiono con più nomi)
const BRANDS: Record<string, string[]> = {
  Aprilia: ['APRILIA'], Benelli: ['BENELLI', 'BENELLI Q.J. SRL'], Beta: ['BETA'], Bimota: ['BIMOTA'], BMW: ['BMW'], CFMoto: ['CFMOTO'],
  Ducati: ['DUCATI'], Energica: ['ENERGICA'], Fantic: ['FANTIC'], GasGas: ['GASGAS'], 'Harley-Davidson': ['HARLEY-DAVIDSON'], Honda: ['HONDA'],
  Husqvarna: ['HUSQVARNA'], Indian: ['INDIAN MOTORCYCLE'], Kawasaki: ['KAWASAKI'], Keeway: ['KEEWAY'], KTM: ['KTM', 'KTMMEX'], Kymco: ['KYMCO'],
  'Moto Guzzi': ['MOTO GUZZI'], 'Moto Morini': ['MOTO MORINI'], 'MV Agusta': ['MV AGUSTA MOTOR'], NIU: ['NIU'],
  Peugeot: ['PEUGEOT MOTORCYCLES'], Piaggio: ['PIAGGIO'], 'Royal Enfield': ['ROYAL ENFIELD'], Suzuki: ['SUZUKI'], SWM: ['SWM'], SYM: ['SYM'],
  Triumph: ['TRIUMPH'], Vespa: ['VESPA', 'PIAGGIO AND VESPA'], Yamaha: ['YAMAHA'], 'Zero Motorcycles': ['ZERO MOTORCYCLES'],
}
const FROM = 2008
const NOW = new Date().getFullYear()

const skipped: string[] = []
const get = async (make: string, year: number): Promise<string[]> => {
  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}/vehicletype/motorcycle?format=json`
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url).catch(() => undefined)
    // vPIC a volte risponde 200 con una pagina HTML di errore: si riprova, poi si salta segnalandolo
    const body = res?.ok ? await res.text() : ''
    if (body.startsWith('{')) return (JSON.parse(body) as { Results: { Model_Name: string }[] }).Results.map((r) => r.Model_Name)
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt))
  }
  skipped.push(`${make} ${year}`)
  return []
}

const jobs = Object.entries(BRANDS).flatMap(([brand, makes]) =>
  makes.flatMap((make) => Array.from({ length: NOW + 1 - FROM + 1 }, (_, i) => ({ brand, make, year: FROM + i }))),
)
const raw: Raw[] = []
// 4 richieste alla volta: vPIC ha un limite "automatico" non dichiarato
for (let i = 0; i < jobs.length; i += 4) {
  const batch = jobs.slice(i, i + 4)
  raw.push(...(await Promise.all(batch.map(async (j) => ({ brand: j.brand, year: j.year, names: await get(j.make, j.year) })))))
  process.stderr.write(`\r${Math.min(i + 4, jobs.length)}/${jobs.length}`)
}
const extra = JSON.parse(readFileSync('data/catalog-extra.json', 'utf8')) as Extra
const catalog = buildCatalog(raw, extra, NOW, new Date().toISOString().slice(0, 10))
writeFileSync('src/data/catalog.json', JSON.stringify(catalog) + '\n')
if (skipped.length) console.error(`\nSaltati (vPIC non ha risposto): ${skipped.join(', ')}`)
console.error(`\n${catalog.brands.length} marche, ${catalog.brands.reduce((s, b) => s + b.models.length, 0)} modelli`)
