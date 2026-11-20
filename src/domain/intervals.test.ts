import { describe, expect, it } from 'vitest'
import { DATA, itemsFor, type Dataset } from './intervals'

const bike = { id: 'b', make: 'Moto', model: 'Senza libretto', year: 2022, category: 'custom' }

describe('itemsFor', () => {
  it('eredita dal preset padre, sovrascrive e annulla con null', () => {
    const items = itemsFor(bike)
    const oil = items.find((i) => i.item === 'engine_oil')
    expect(oil).toMatchObject({ km: 8000, months: 12, firstKm: 1000, origin: 'preset' })
    expect(items.some((i) => i.item === 'chain')).toBe(false)
    expect(items.find((i) => i.item === 'valve_clearance')?.km).toBe(40000)
  })

  it('preferisce il modello verificato, con alias e anni', () => {
    const d: Dataset = {
      ...DATA,
      models: [
        { id: 'yamaha.mt07', label: '', make: 'Yamaha', model: 'MT-07', aliases: ['MT07'], yearFrom: 2021, yearTo: null, extends: 'preset.naked', source: {}, intervals: [{ item: 'valve_clearance', action: 'inspect', km: 42000 }] },
      ],
    }
    expect(itemsFor({ ...bike, make: 'Yamaha', model: 'mt 07' }, d).find((i) => i.item === 'valve_clearance')).toMatchObject({ km: 42000, origin: 'model' })
    expect(itemsFor({ ...bike, make: 'Yamaha', model: 'MT-07', year: 2019 }, d)[0]?.origin).toBe('preset')
  })

  it('Kawasaki Z650 2017: valori del libretto e due voci per la catena', () => {
    const items = itemsFor({ id: 'b', make: 'kawasaki', model: 'Z 650', year: 2017 })
    expect(items.every((i) => i.origin === 'model')).toBe(true)
    expect(items.find((i) => i.item === 'air_filter')?.km).toBe(18000)
    expect(items.filter((i) => i.item === 'chain').map((i) => [i.label, i.km])).toEqual([
      ['Catena (lubrificazione)', 600],
      ['Catena (regolazione)', 1000],
    ])
    expect(itemsFor({ id: 'b', make: 'Kawasaki', model: 'Z650', year: 2020, category: 'naked' }).find((i) => i.item === 'air_filter')?.km).toBe(12000)
    expect(itemsFor({ id: 'b', make: 'Kawasaki', model: 'Z650', year: 2024, category: 'naked' })[0]?.origin).toBe('preset')
  })

  it('ogni modello ha una fonte e voci valide', () => {
    for (const m of DATA.models) {
      expect(m.source).toBeTruthy()
      for (const i of m.intervals) expect(Object.keys(DATA.items)).toContain(i.item)
    }
  })

  it('ogni preset del dataset si risolve e ha almeno un intervallo per voce', () => {
    for (const p of DATA.presets) {
      const items = itemsFor({ ...bike, category: p.id.replace('preset.', '') })
      expect(items.length).toBeGreaterThan(0)
      for (const i of items) expect(i.km ?? i.months).toBeGreaterThan(0)
    }
  })
})

describe('libretti seconda tornata', () => {
  it('Honda SH125i: olio a 1.000 km poi ogni 6.000 km o 12 mesi, dal libretto', () => {
    const items = itemsFor({ id: 'b', make: 'Honda', model: 'SH 125', year: 2022 })
    expect(items.every((i) => i.origin === 'model')).toBe(true)
    expect(items.find((i) => i.item === 'engine_oil')).toMatchObject({ km: 6000, months: 12, firstKm: 1000 })
  })
  it('Yamaha MT-07 dal libretto solo per la generazione 2021–2024', () => {
    expect(itemsFor({ id: 'b', make: 'Yamaha', model: 'MT-07', year: 2023 })[0]?.origin).toBe('model')
    expect(itemsFor({ id: 'b', make: 'Yamaha', model: 'MT-07', year: 2025, category: 'naked' })[0]?.origin).toBe('preset')
  })
})
