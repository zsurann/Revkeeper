import { expect, it } from 'vitest'
import { baseName, buildCatalog, type Extra } from './catalogBuild'
import catalog from '../data/catalog.json'

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
  expect(JSON.stringify(catalog).length).toBeLessThan(400_000)
})
