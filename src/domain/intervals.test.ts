import { describe, expect, it } from 'vitest'
import { DATA, itemsFor, type Dataset } from './intervals'

const bike = { id: 'b', make: 'Yamaha', model: 'MT-07', year: 2022, category: 'custom' }

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
    expect(itemsFor({ ...bike, model: 'mt 07' }, d).find((i) => i.item === 'valve_clearance')).toMatchObject({ km: 42000, origin: 'model' })
    expect(itemsFor({ ...bike, year: 2019 }, d)[0]?.origin).toBe('preset')
  })

  it('ogni preset del dataset si risolve e ha almeno un intervallo per voce', () => {
    for (const p of DATA.presets) {
      const items = itemsFor({ ...bike, category: p.id.replace('preset.', '') })
      expect(items.length).toBeGreaterThan(0)
      for (const i of items) expect(i.km ?? i.months).toBeGreaterThan(0)
    }
  })
})
