import type { EuModel } from './euImport'

// Pulizia del catalogo da vPIC: usata dallo script scripts/build-catalog.ts e dai test
// Dati tecnici per generazione (anni da–a), presi dalla scheda ufficiale indicata in `source`
export type Spec = {
  from: number
  to: number | null
  cc?: number
  hp?: number
  kg?: number
  tankLitres?: number
  tyreFront?: string
  tyreRear?: string
  oilGrade?: string
  oilLitres?: number
  brakeFluid?: string
  source: string
}
export type CatalogModel = { name: string; aliases?: string[]; from: number; to: number | null; specs?: Spec[] }
export type Catalog = { generatedAt: string; brands: { name: string; models: CatalogModel[] }[] }
export type Raw = { brand: string; year: number; names: string[] }
export type Extra = { popular: string[]; brands: Record<string, { models?: CatalogModel[]; exclude?: string[] }> }

// Fuoristrada a 4 ruote e side-by-side che vPIC mescola alle moto
const DENY = /\b(ATV|UTV|SxS|Quad|Brute Force|Mule|Teryx\w*|KFX\w*|Bayou|Prairie|Big Red|Ridge|Pioneer\w*|Grizzly|Kodiak|Wolverine|Viking|Rhino|YFZ|YFM|Raptor|Foreman|Rancher|Rubicon|Recon|Pioneer|Talon|TRX|Sportsman|Outlander|Renegade|Maverick|Commander|RMAX|Ranger|General|Prowler)\b/i
// Allestimenti che non cambiano i dati tecnici della scheda: si uniscono al modello base
const TRIM = /\s+(non[- ]?abs|abs|se|krt( edition)?|special edition|limited( edition)?|\d+(th|st|nd|rd) anniversary( edition)?|anniversary( edition)?|edition|cbs)$/i

export const brandSlug = (name: string) => name.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export const baseName = (raw: string) => {
  let n = raw.trim().replace(/\s+/g, ' ')
  for (let prev = ''; prev !== n; ) {
    prev = n
    n = n.replace(TRIM, '')
  }
  return n
}
const key = (s: string) => s.toLowerCase().replace(/[\s\-_]/g, '')
const keep = (n: string) => !DENY.test(n) && !/[/,]/.test(n) && n.length > 1

const SOURCE: Record<string, string> = { traficom: 'Traficom (CC BY 4.0)', dgt: 'DGT', astra: 'ASTRA' }

export const buildCatalog = (
  raw: Raw[],
  extra: Extra,
  currentYear: number,
  generatedAt: string,
  eu: Pick<EuModel, 'make' | 'model' | 'from' | 'to' | 'cc' | 'kw' | 'kg' | 'tyreFront' | 'tyreRear' | 'sources'>[] = [],
): Catalog => {
  const byBrand = new Map<string, Map<string, CatalogModel>>()
  const add = (brand: string, m: CatalogModel) => {
    const models = byBrand.get(brand) ?? new Map<string, CatalogModel>()
    byBrand.set(brand, models)
    const k = key(m.name)
    const old = models.get(k)
    if (!old) return void models.set(k, { ...m })
    const aliases = [...new Set([...(old.aliases ?? []), ...(m.aliases ?? [])])].filter((a) => key(a) !== k)
    models.set(k, {
      ...old,
      ...(m.specs && { specs: m.specs }),
      aliases: aliases.length ? aliases : undefined,
      from: Math.min(old.from, m.from),
      to: old.to === null || m.to === null ? null : Math.max(old.to, m.to),
    })
  }
  for (const r of raw)
    for (const n of r.names.filter(keep)) {
      const name = baseName(n)
      if (extra.brands[r.brand]?.exclude?.some((x) => key(x) === key(name))) continue
      // Modelli prodotti fino all'anno scorso o oltre risultano ancora in produzione
      add(r.brand, { name, aliases: name !== n.trim() ? [n.trim()] : undefined, from: r.year, to: r.year >= currentYear - 1 ? null : r.year })
    }
  const ongoing = (y: number) => (y >= currentYear - 1 ? null : y)
  for (const m of eu) {
    if (extra.brands[m.make]?.exclude?.some((x) => key(x) === key(m.model))) continue
    const spec: Spec = {
      from: m.from,
      to: ongoing(m.to),
      cc: Math.round(m.cc),
      ...(m.kw > 0 && { hp: Math.round(m.kw * 1.36) }),
      ...(m.kg && { kg: Math.round(m.kg) }),
      ...(m.tyreFront && { tyreFront: m.tyreFront }),
      ...(m.tyreRear && { tyreRear: m.tyreRear }),
      source: `Registri ufficiali: ${m.sources.map((s) => SOURCE[s] ?? s).join(', ')}`,
    }
    add(m.make, { name: m.model, from: m.from, to: ongoing(m.to), specs: [spec] })
  }
  for (const [brand, e] of Object.entries(extra.brands)) {
    if (!byBrand.has(brand)) byBrand.set(brand, new Map())
    for (const m of e.models ?? []) add(brand, m)
  }
  const rank = (b: string) => {
    const i = extra.popular.indexOf(b)
    return i < 0 ? Infinity : i
  }
  const brands = [...byBrand.entries()]
    .map(([name, models]) => ({ name, models: [...models.values()].sort((a, b) => a.name.localeCompare(b.name, 'it', { numeric: true })) }))
    .sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name, 'it'))
  return { generatedAt, brands }
}
