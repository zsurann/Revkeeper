import { expect, it } from 'vitest'
import { display, groupModels, modelYear, normModel, parseCsv, parseTyres, type RegRow } from './euImport'

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

it('legge il CSV di ASTRA con virgolette e a capo nei campi', () => {
  expect(parseCsv('﻿a;b\n1;"x\ny";"z ""q"""\r\n2;;\n'.replace(/^﻿/, ''))).toEqual([['a', 'b'], ['1', 'x\ny', 'z "q"'], ['2', '', '']])
})

it('estrae le gomme dalle omologazioni ASTRA', () => {
  expect(parseTyres('v= 120/70ZR17 (40U);  3.50x17\nh= 160/60ZR17 (63U);  4.50x17')).toEqual({ front: '120/70 ZR17', rear: '160/60 ZR17' })
  expect(parseTyres('v= 100/80-16 50P;  2.50x16\nh= 120/80-16 60P;  2.75x16\nMindest-Index: v= 29J  /  h= 55J')).toEqual({ front: '100/80-16', rear: '120/80-16' })
  expect(parseTyres('v+h= 130/60-13 53J;  13x3.50 LM-Integral')).toEqual({ front: '130/60-13', rear: '130/60-13' })
  expect(parseTyres('120/70-12; 12x3.00 LM-Integral')).toEqual({ front: '120/70-12', rear: '120/70-12' })
  expect(parseTyres('v=2 1/2-16 31J, 70/90-16 36J; 16X1.60\nh=2 3/4-16')).toEqual({ front: '70/90-16', rear: undefined })
})

it("un'omologazione ASTRA basta da sola e porta le gomme più frequenti", () => {
  const a = (year: number, tyreFront: string): RegRow => ({ src: 'astra', make: 'Kawasaki', name: 'Z650', year, cc: 649, kw: 50.2, kg: 0, tyreFront, tyreRear: '160/60 ZR17' })
  const [m] = groupModels([a(2016, '120/70 ZR17'), a(2019, '120/70 ZR17'), a(2022, '120/60 ZR17')])
  expect(m).toMatchObject({ model: 'Z650', from: 2016, to: 2022, tyreFront: '120/70 ZR17', tyreRear: '160/60 ZR17', sources: ['astra'] })
  expect(m!.kg).toBeUndefined()
})

it('gli anni si calcolano per fonte: tante immatricolazioni recenti non cancellano quelle vecchie', () => {
  const r = (src: RegRow['src'], year: number): RegRow => ({ src, make: 'Honda', name: 'SH125', year, cc: 125, kw: 9.6, kg: 0 })
  const [m] = groupModels([...Array.from({ length: 20 }, (_, i) => r('traficom', 2004 + i)), ...Array.from({ length: 2000 }, () => r('dgt', 2026))])
  expect(m).toMatchObject({ from: 2004, to: 2026 })
})

it("l'anno modello di un'omologazione", () => {
  expect(modelYear('2016-10-24')).toBe(2017)
  expect(modelYear('2020-03-04')).toBe(2020)
})
