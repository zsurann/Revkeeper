import { expect, it } from 'vitest'
import { checkFile, MAX_FILE, serviceFromForm } from './serviceForm'

const fd = (o: Record<string, string | string[]>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(o)) for (const x of [v].flat()) f.append(k, x)
  return f
}
const base = { date: '2026-11-10', km: '23500', itemIds: ['oil', 'filter'] }

it('legge voci multiple e somma ricambi e manodopera', () => {
  const s = serviceFromForm(fd({ ...base, costParts: '1.120,50', costLabour: '80' }), 'b', '2026-11-20')
  expect(s).toMatchObject({ bikeId: 'b', km: 23500, itemIds: ['oil', 'filter'], costParts: 1120.5, costLabour: 80, costTotal: 1200.5 })
})

it('il totale scritto vince', () => {
  expect(serviceFromForm(fd({ ...base, costTotal: '210', costParts: '100' }), 'b', '2026-11-20').costTotal).toBe(210)
})

it('legge importi con punto o virgola decimale e migliaia', () => {
  const total = (v: string) => serviceFromForm(fd({ ...base, costTotal: v }), 'b', '2026-11-20').costTotal
  expect(total('12.50')).toBe(12.5)
  expect(total('12,50')).toBe(12.5)
  expect(total('12.5')).toBe(12.5)
  expect(total('1.200')).toBe(1200)
  expect(total('1.120,50')).toBe(1120.5)
  expect(total('1.234.567')).toBe(1234567)
  expect(total('80')).toBe(80)
  expect(() => total('1,2,3')).toThrow(RangeError)
})

it('rifiuta data futura, nessuna voce, km non validi', () => {
  expect(() => serviceFromForm(fd({ ...base, date: '2026-12-01' }), 'b', '2026-11-20')).toThrow(RangeError)
  expect(() => serviceFromForm(fd({ ...base, itemIds: [] }), 'b', '2026-11-20')).toThrow(RangeError)
  expect(() => serviceFromForm(fd({ ...base, km: '-1' }), 'b', '2026-11-20')).toThrow(RangeError)
})

it('accetta foto e PDF fino a 15 MB', () => {
  expect(() => checkFile({ size: 1000, type: 'application/pdf' })).not.toThrow()
  expect(() => checkFile({ size: MAX_FILE + 1, type: 'image/jpeg' })).toThrow('15 MB')
  expect(() => checkFile({ size: 10, type: 'text/plain' })).toThrow('Solo foto o PDF')
})

it('accetta i km con il punto delle migliaia, ma non un decimale', () => {
  expect(serviceFromForm(fd({ ...base, km: '8.836' }), 'b', '2026-11-20').km).toBe(8836)
  expect(serviceFromForm(fd({ ...base, km: '23 500' }), 'b', '2026-11-20').km).toBe(23500)
  expect(() => serviceFromForm(fd({ ...base, km: '12.5' }), 'b', '2026-11-20')).toThrow('Km non validi')
})
