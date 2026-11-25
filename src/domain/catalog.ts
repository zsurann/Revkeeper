import index from '../data/catalog/_brands.json'
import type { CatalogModel, Spec } from './catalogBuild'

// Ogni marca è un file a parte, caricato quando serve (Vite lo rende un chunk; il service worker lo tiene offline)
const files = import.meta.glob<CatalogModel[]>('../data/catalog/b-*.json', { import: 'default' })
const loaded = new Map<string, CatalogModel[]>()
const key = (s: string) => s.toLowerCase().replace(/[\s\-_]/g, '')
const thisYear = () => new Date().getFullYear()

export const brands = () => index.brands.map((b) => b.name)
const entry = (make: string) => index.brands.find((b) => key(b.name) === key(make))

export const loadBrand = async (make: string) => {
  const b = entry(make)
  if (!b || loaded.has(b.slug)) return
  const load = files[`../data/catalog/b-${b.slug}.json`]
  if (load) loaded.set(b.slug, await load())
}
const modelsFor = (make: string) => loaded.get(entry(make)?.slug ?? '') ?? []
const model = (make: string, name: string) =>
  modelsFor(make).find((m) => key(m.name) === key(name) || m.aliases?.some((a) => key(a) === key(name)))

export const modelsOf = (make: string) => modelsFor(make).map((m) => ({ label: m.name, hint: `${m.from}–${m.to ?? 'oggi'}`, aliases: m.aliases }))

// Anni dal più recente; senza modello nel catalogo, tutti gli anni dal 1970
export const yearsOf = (make: string, name: string) => {
  const m = model(make, name)
  const from = m?.from ?? 1970
  const to = Math.max(m?.to ?? thisYear(), from)
  return Array.from({ length: to - from + 1 }, (_, i) => to - i)
}

// Senza anno vale la generazione più recente; con l'anno, quella che lo copre (o nessuna)
export const specsOf = (make: string, name: string, year?: number): Spec | undefined => {
  const specs = model(make, name)?.specs ?? []
  return year === undefined ? specs.at(-1) : specs.find((s) => s.from <= year && (s.to === null || year <= s.to))
}
