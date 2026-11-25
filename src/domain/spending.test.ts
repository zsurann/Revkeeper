import { expect, it } from 'vitest'
import { spendingStats } from './spending'
import type { Bike, MaintenanceItem, Service } from './types'

const bike = { id: 'b', updatedAt: 0, make: 'Honda', model: 'CB500F', year: 2020, startKm: 10000, startDate: '2023-01-01' } as Bike
const items = [
  { id: 'oil', label: 'Olio motore' },
  { id: 'chain', label: 'Catena' },
] as MaintenanceItem[]
const svc = (date: string, cost: number | undefined, itemIds: string[], extra: Partial<Service> = {}) =>
  ({ id: date, updatedAt: 0, bikeId: 'b', date, km: 0, itemIds, attachmentIds: [], costTotal: cost, ...extra }) as Service

it('somma per anno (anche quelli vuoti), per voce e al km', () => {
  const s = spendingStats(bike, [svc('2023-05-01', 100, ['oil']), svc('2025-03-01', 300, ['oil', 'chain']), svc('2025-04-01', undefined, ['chain'])], items, [
    { id: 'r', updatedAt: 0, bikeId: 'b', date: '2025-06-01', km: 14000 },
  ])
  expect(s.total).toBe(400)
  expect(s.byYear).toEqual([{ year: '2023', total: 100 }, { year: '2024', total: 0 }, { year: '2025', total: 300 }])
  expect(s.byItem).toEqual([{ label: 'Olio motore', total: 250 }, { label: 'Catena', total: 150 }])
  expect(s.perKm).toBe(0.1)
})

it('ignora interventi eliminati e senza km percorsi non calcola il costo al km', () => {
  const s = spendingStats(bike, [svc('2025-01-01', 50, [], { deletedAt: 1 }), svc('2025-02-01', 80, [])], items, [])
  expect(s.total).toBe(80)
  expect(s.byItem).toEqual([{ label: 'Altro', total: 80 }])
  expect(s.perKm).toBeUndefined()
})
