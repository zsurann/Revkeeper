import { expect, it } from 'vitest'
import { display, groupModels, normModel, type RegRow } from './euImport'

it('normalizza i nomi dei registri', () => {
  expect(normModel('SH125AD,SH125D', 'Honda')).toBe('SH125')
  expect(normModel('SH 125 I', 'Honda')).toBe('SH125')
  expect(normModel('Z650 ABS', 'Kawasaki')).toBe('Z650')
  expect(normModel('TRK 502 X,TRK502,TRK502X', 'Benelli')).toBe('TRK502')
  expect(normModel('TRK 702 35KW', 'Benelli')).toBe('TRK702')
  expect(normModel('Z650RS', 'Kawasaki')).toBe('Z650RS')
  expect(normModel('KAWASAKI Z900', 'Kawasaki')).toBe('Z900')
  expect(normModel('MTN690-A (MT-07)', 'Yamaha')).toBe('MT-07')
  expect(normModel('MT07A (MT-07 Abs)', 'Yamaha')).toBe('MT-07')
  expect(display('VESPA GTS')).toBe('Vespa GTS')
})

it('raggruppa per modello e cilindrata, con anni e valori tipici', () => {
  const r = (name: string, year: number, cc: number, kw = 50, kg = 188): RegRow => ({ src: 'traficom', make: 'Kawasaki', name, year, cc, kw, kg })
  const rows = [
    ...Array.from({ length: 6 }, (_, i) => r('Z650', 2017 + i, 649)),
    r('Z650 ABS', 2023, 649, 35),
    ...Array.from({ length: 5 }, (_, i) => r('Z650', 1977 + i, 652, 46, 230)),
    r('Z1000', 2015, 1043), // sotto la soglia di 5 veicoli
  ]
  const m = groupModels(rows)
  expect(m).toHaveLength(2)
  const modern = m.find((x) => x.from === 2017)!
  expect(modern).toMatchObject({ model: 'Z650', cc: 649, kg: 188, n: 7, to: 2023, kw: 50 }) // la versione A2 da 35 kW non conta
  expect(m.find((x) => x.from === 1977)?.cc).toBe(652)
})
