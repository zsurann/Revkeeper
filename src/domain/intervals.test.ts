import { describe, expect, it } from 'vitest'
import { DATA, itemsFor, type Dataset, type ItemDraft } from './intervals'
import type { MaintenanceItem } from './types'

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

it('libretti terza tornata: Honda Forza 350 2025 e Yamaha MT-09 2021–2023 dal libretto', () => {
  expect(itemsFor({ id: 'b', make: 'Honda', model: 'Forza 350', year: 2025 }).every((i) => i.origin === 'model')).toBe(true)
  expect(itemsFor({ id: 'b', make: 'Yamaha', model: 'MT-09', year: 2022 })[0]?.origin).toBe('model')
  expect(itemsFor({ id: 'b', make: 'Yamaha', model: 'MT-09', year: 2024, category: 'naked' })[0]?.origin).toBe('preset')
})

it('applicare il libretto non cancella le voci personalizzate e tiene gli id (storico collegato)', async () => {
  const { applyManual } = await import('./intervals')
  const base = { bikeId: 'b', updatedAt: 0 }
  const items = [
    { ...base, id: 'oil', item: 'oil', label: 'Olio motore', action: 'replace', km: 10000, origin: 'preset', notes: '10W-40' },
    { ...base, id: 'chain', item: 'chain', label: 'Catena', action: 'lube', km: 500, origin: 'user' },
    { ...base, id: 'pads', item: 'custom', label: 'Pastiglie', action: 'inspect', km: 15000, origin: 'user' },
  ] as MaintenanceItem[]
  const drafts = [
    { bikeId: 'b', item: 'oil', label: 'Olio motore', action: 'replace', km: 12000, months: 12, origin: 'model' },
    { bikeId: 'b', item: 'chain', label: 'Catena', action: 'lube', km: 600, origin: 'model' },
    { bikeId: 'b', item: 'valves', label: 'Gioco valvole', action: 'inspect', km: 24000, origin: 'model' },
  ] as ItemDraft[]
  const out = applyManual(items, drafts)
  expect(out).toHaveLength(2)
  expect(out[0]).toMatchObject({ id: 'oil', km: 12000, months: 12, origin: 'model', notes: '10W-40' })
  expect(out[1]).toMatchObject({ item: 'valves' })
  expect(out[1]).not.toHaveProperty('id')
})
