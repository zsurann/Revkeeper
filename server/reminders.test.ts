import { expect, it } from 'vitest'
import { localParts, pushText, remindersFor, type Rec } from './reminders'

const bike = { id: 'b', updatedAt: 0, make: 'Kawasaki', model: 'Z650', year: 2017, startKm: 30000, startDate: '2026-01-01' }
const recs = (today: string): Rec[] => [
  { kind: 'bikes', data: bike },
  { kind: 'readings', data: { id: 'r', updatedAt: 0, bikeId: 'b', date: '2026-10-21', km: 30500 } },
  { kind: 'items', data: { id: 'i', updatedAt: 0, bikeId: 'b', item: 'brake_fluid', label: 'Liquido freni', action: 'replace', months: 12, origin: 'model' } },
  { kind: 'documents', data: { id: 'd', updatedAt: 0, bikeId: 'b', kind: 'revisione', dueDate: '2026-11-27', attachmentIds: [] } },
  { kind: 'other', data: today },
]

it('avvisa a 7 giorni, a 30 giorni e per i km fermi da 30 giorni', () => {
  expect(remindersFor(recs('2026-11-20'), '2026-11-20')).toEqual([
    'Kawasaki Z650: La revisione scade tra 7 giorni',
    'Kawasaki Z650: aggiorna i km (30.500 km di 30 giorni fa)',
  ])
  expect(remindersFor(recs('2026-12-02'), '2026-12-02')).toEqual(['Kawasaki Z650: Liquido freni scade tra 30 giorni'])
  expect(remindersFor(recs('2026-11-21'), '2026-11-21')).toEqual([])
})

it("calcola data e ora locali nel fuso dell'utente", () => {
  expect(localParts(new Date('2026-11-20T23:30:00Z'), 'Europe/Rome')).toEqual({ date: '2026-11-21', hour: 0 })
})

it('testo della notifica: la scadenza nel titolo, la moto nel testo', () => {
  expect(pushText(['Kawasaki Z650: Liquido freni scade tra 30 giorni'])).toEqual({ title: 'Liquido freni scade tra 30 giorni', body: 'Kawasaki Z650' })
  expect(pushText(['Kawasaki Z650: aggiorna i km (23.418 km di 30 giorni fa)']).title).toBe('Aggiorna i km (23.418 km di 30 giorni fa)')
  expect(pushText(['a', 'b'])).toEqual({ title: '2 scadenze in arrivo', body: 'a\nb' })
})
