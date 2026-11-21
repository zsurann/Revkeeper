import { beforeAll, expect, it } from 'vitest'
import { brands, loadBrand, modelsOf, yearsOf } from './catalog'

beforeAll(() => Promise.all(['Kawasaki', 'Honda', 'Yamaha'].map(loadBrand)))

it('marche popolari prima, modelli della marca, anni dal più recente', () => {
  expect(brands().slice(0, 3)).toEqual(['Honda', 'Yamaha', 'Kawasaki'])
  expect(modelsOf('kawasaki').some((m) => m.label === 'Z650')).toBe(true)
  expect(modelsOf('Ducati')).toEqual([]) // marca non ancora caricata
  const years = yearsOf('kawasaki', 'z 650') // maiuscole e spazi non contano
  expect(years.at(-1)).toBe(2017)
  expect(years[0]).toBeGreaterThan(years.at(-1)!)
  expect(yearsOf('Marca', 'sconosciuta').at(-1)).toBe(1970)
})

it('dati tecnici per generazione: anno preciso, oppure la più recente', async () => {
  const { specsOf } = await import('./catalog')
  expect(specsOf('Kawasaki', 'Z650', 2017)).toMatchObject({ cc: 649, kg: 186, tyreFront: '120/70 ZR17', tyreRear: '160/60 ZR17' })
  expect(specsOf('Kawasaki', 'Z650', 2021)?.kg).toBe(187)
  expect(specsOf('Kawasaki', 'Z650')?.from).toBe(2024)
  expect(specsOf('Honda', 'SH125i', 2015)).toBeUndefined() // generazione precedente non verificata
  expect(specsOf('Yamaha', 'MT-07')?.tyreFront).toBe('120/70 ZR17') // misura normalizzata
})
