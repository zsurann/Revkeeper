import data from '../data/catalog.json'
import type { Catalog, Spec } from './catalogBuild'

const CAT = data as Catalog
const key = (s: string) => s.toLowerCase().replace(/[\s\-_]/g, '')
const thisYear = () => new Date().getFullYear()

export const brands = () => CAT.brands.map((b) => b.name)
const brand = (make: string) => CAT.brands.find((b) => key(b.name) === key(make))
const model = (make: string, name: string) =>
  brand(make)?.models.find((m) => key(m.name) === key(name) || m.aliases?.some((a) => key(a) === key(name)))

export const modelsOf = (make: string) =>
  (brand(make)?.models ?? []).map((m) => ({ label: m.name, hint: `${m.from}–${m.to ?? 'oggi'}`, aliases: m.aliases }))

// Anni dal più recente; senza modello nel catalogo, tutti gli anni dal 1970
export const yearsOf = (make: string, name: string) => {
  const m = model(make, name)
  const to = m?.to ?? thisYear()
  const from = m?.from ?? 1970
  return Array.from({ length: to - from + 1 }, (_, i) => to - i)
}

// Senza anno vale la generazione più recente; con l'anno, quella che lo copre (o nessuna)
export const specsOf = (make: string, name: string, year?: number): Spec | undefined => {
  const specs = model(make, name)?.specs ?? []
  return year === undefined ? specs.at(-1) : specs.find((s) => s.from <= year && (s.to === null || year <= s.to))
}
