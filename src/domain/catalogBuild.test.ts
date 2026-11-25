import { expect, it } from 'vitest'
import { baseName, buildCatalog, type Extra } from './catalogBuild'
import { readdirSync, readFileSync } from 'node:fs'

const DIR = 'src/data/catalog'
const index = JSON.parse(readFileSync(`${DIR}/_brands.json`, 'utf8')) as { brands: { name: string; slug: string }[] }
const catalog = { brands: index.brands.map((b) => ({ name: b.name, models: JSON.parse(readFileSync(`${DIR}/b-${b.slug}.json`, 'utf8')) as { name: string; from: number; to: number | null }[] })) }

it('toglie gli allestimenti che non cambiano la scheda', () => {
  expect(baseName('Z650 ABS')).toBe('Z650')
  expect(baseName('Ninja 650 KRT Edition ABS')).toBe('Ninja 650')
  expect(baseName('SH150i')).toBe('SH150i')
})

it('unisce anni e varianti, scarta quad e voci aggregate, aggiunge i modelli europei', () => {
  const extra: Extra = { popular: ['Honda', 'Kawasaki'], brands: { Honda: { models: [{ name: 'SH125i', from: 2001, to: null }] }, Kawasaki: { exclude: ['Z125'] } } }
  const c = buildCatalog(
    [
      { brand: 'Kawasaki', year: 2017, names: ['Z650', 'Z650 ABS', 'Brute Force 750', 'Z125'] },
      { brand: 'Kawasaki', year: 2025, names: ['Z650 ABS', '790/890 Adv R, Rally'] },
      { brand: 'Kawasaki', year: 2019, names: ['Z650'] },
    ],
    extra,
    2026,
    'x',
  )
  expect(c.brands.map((b) => b.name)).toEqual(['Honda', 'Kawasaki'])
  expect(c.brands[1]?.models).toEqual([{ name: 'Z650', aliases: ['Z650 ABS'], from: 2017, to: null }])
  expect(c.brands[0]?.models[0]?.name).toBe('SH125i')
})

it('il catalogo generato è valido: niente marche doppie, anni sensati, la Z650 c è', () => {
  const names = catalog.brands.map((b) => b.name)
  expect(new Set(names).size).toBe(names.length)
  for (const b of catalog.brands)
    for (const m of b.models) {
      expect(m.from).toBeGreaterThan(1950)
      if (m.to !== null) expect(m.to).toBeGreaterThanOrEqual(m.from)
    }
  const z = catalog.brands.find((b) => b.name === 'Kawasaki')?.models.find((m) => m.name === 'Z650')
  expect(z?.from).toBeLessThanOrEqual(2017)
  // ogni marca è un file: l'indice resta piccolo e nessun file di marca è enorme
  expect(readFileSync(`${DIR}/_brands.json`, 'utf8').length).toBeLessThan(20_000)
  for (const f of readdirSync(DIR)) expect(readFileSync(`${DIR}/${f}`, 'utf8').length).toBeLessThan(150_000)
  expect(new Set(index.brands.map((b) => b.slug)).size).toBe(index.brands.length)
})

it('cita Ufficio federale delle strade (USTRA) per le specifiche ASTRA', () => {
  const c = buildCatalog(
    [],
    { popular: [], brands: {} },
    2026,
    'x',
    [{ make: 'Kawasaki', model: 'Z650', from: 2017, to: 2026, cc: 649, kw: 50.2, kg: 188, tyreFront: '120/70 ZR17', tyreRear: '160/60 ZR17', sources: ['astra', 'traficom'] }],
  )
  const src = c.brands[0]?.models[0]?.specs?.[0]?.source
  expect(src).toBe('Registri ufficiali: Ufficio federale delle strade (USTRA), Traficom (CC BY 4.0)')
  for (const f of readdirSync(DIR)) {
    if (!f.startsWith('b-')) continue
    const models = JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')) as { specs?: { source?: string }[] }[]
    for (const m of models)
      for (const sp of m.specs ?? [])
        if (sp.source?.includes('ASTRA')) expect(sp.source).toContain('Ufficio federale delle strade')
  }
})
