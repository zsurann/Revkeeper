import { afterEach, expect, test, vi } from 'vitest'
import { dueShort, eur, every, km, today } from './format'

afterEach(() => { vi.useRealTimers(); delete process.env.TZ })

test('today usa la data locale, non UTC', () => {
  process.env.TZ = 'Europe/Rome'
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-03-09T23:30:00Z')) // 00:30 del 10/03 a Roma
  expect(today()).toBe('2026-03-10')
})

test('km ed euro hanno sempre il punto delle migliaia, anche sotto 10.000', () => {
  expect(km(8836)).toBe('8.836 km')
  expect(km(12345)).toBe('12.345 km')
  expect(km(950)).toBe('950 km')
  expect(eur(1234.5).replace(/\s/g, ' ')).toBe('1.234,50 €')
  expect(dueShort({ kmLeft: 9336, progress: 0, status: 'ok' })).toBe('tra 9.336 km')
  expect(every({ km: 6000, months: 12 })).toBe('ogni 6.000 km o 12 mesi')
})
