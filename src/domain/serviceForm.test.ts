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
