import { afterEach, expect, test, vi } from 'vitest'
import { today } from './format'

afterEach(() => { vi.useRealTimers(); delete process.env.TZ })

test('today usa la data locale, non UTC', () => {
  process.env.TZ = 'Europe/Rome'
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-03-09T23:30:00Z')) // 00:30 del 10/03 a Roma
  expect(today()).toBe('2026-03-10')
})
