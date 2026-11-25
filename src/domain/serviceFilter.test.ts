import { expect, it } from 'vitest'
import { filterServices, serviceYears } from './serviceFilter'
import type { MaintenanceItem, Service } from './types'

const items = [{ id: 'oil', label: 'Olio motore' }, { id: 'brk', label: 'Liquido freni' }] as MaintenanceItem[]
const s = (id: string, date: string, itemIds: string[], notes?: string) => ({ id, date, itemIds, notes, km: 0, bikeId: 'b', updatedAt: 0, attachmentIds: [] }) as Service
const all = [s('a', '2025-03-01', ['oil'], 'Officina Rossi, filtro HF204'), s('b', '2026-05-01', ['brk']), s('c', '2026-09-01', ['oil', 'brk'], 'Pastiglie Brembo')]

it('cerca in note e voci senza badare ad accenti e maiuscole', () => {
  expect(filterServices(all, items, { q: 'rossi' }).map((x) => x.id)).toEqual(['a'])
  expect(filterServices(all, items, { q: 'FRENI' }).map((x) => x.id)).toEqual(['b', 'c'])
  expect(filterServices(all, items, { q: 'officina' }).map((x) => x.id)).toEqual(['a'])
})

it('filtra per anno e per voce, insieme alla ricerca', () => {
  expect(filterServices(all, items, { year: '2026' }).map((x) => x.id)).toEqual(['b', 'c'])
  expect(filterServices(all, items, { year: '2026', itemId: 'oil' }).map((x) => x.id)).toEqual(['c'])
  expect(filterServices(all, items, { q: 'brembo', itemId: 'brk' }).map((x) => x.id)).toEqual(['c'])
  expect(serviceYears(all)).toEqual(['2026', '2025'])
})
