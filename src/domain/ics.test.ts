import { expect, it } from 'vitest'
import { icsFor } from './ics'
import type { Bike, BikeDocument } from './types'

const bike = { id: 'b', updatedAt: 0, make: 'Kawasaki', model: 'Z650', year: 2020, startKm: 0, startDate: '2024-01-01', plate: 'AB12345' } as Bike
const doc = (kind: BikeDocument['kind'], dueDate: string, extra: Partial<BikeDocument> = {}) => ({ id: `d-${kind}`, updatedAt: 0, bikeId: 'b', kind, dueDate, attachmentIds: [], ...extra }) as BikeDocument

it('una giornata intera per scadenza con promemoria a 7 giorni e la mattina', () => {
  const ics = icsFor(bike, [doc('bollo', '2026-12-31'), doc('revisione', '2027-03-01', { deletedAt: 1 })], new Date('2026-11-25T10:00:00Z'))
  expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0')).toBe(true)
  expect(ics).toContain('DTSTART;VALUE=DATE:20261231\r\nDTEND;VALUE=DATE:20270101')
  expect(ics).toContain('SUMMARY:Bollo in scadenza · Kawasaki Z650')
  expect(ics).toContain('TRIGGER:-P7D')
  expect(ics).toContain('DTSTAMP:20261125T100000Z')
  expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1) // la revisione eliminata non c'è
  for (const line of ics.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
})
