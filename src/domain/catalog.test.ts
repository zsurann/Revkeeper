import { expect, it } from 'vitest'
import { brands, modelsOf, yearsOf } from './catalog'

it('marche popolari prima, modelli della marca, anni dal più recente', () => {
  expect(brands().slice(0, 3)).toEqual(['Honda', 'Yamaha', 'Kawasaki'])
  expect(modelsOf('kawasaki').some((m) => m.label === 'Z650')).toBe(true)
  const years = yearsOf('kawasaki', 'z 650') // maiuscole e spazi non contano
  expect(years.at(-1)).toBe(2017)
  expect(years[0]).toBeGreaterThan(years.at(-1)!)
  expect(yearsOf('Marca', 'sconosciuta').at(-1)).toBe(1970)
})
