import { describe, expect, it } from 'vitest'
import { addMonths, currentKm, kmPerDay, nextDue, documentStatus, nextRevisionYear } from './due'
import { DEFAULT_THRESHOLDS as T, type Bike, type MaintenanceItem, type OdometerReading, type Service } from './types'

const bike: Bike = { id: 'b', updatedAt: 0, make: 'Honda', model: 'Africa Twin', year: 2022, startKm: 0, startDate: '2022-03-01' }
const oil: MaintenanceItem = { id: 'oil', updatedAt: 0, bikeId: 'b', item: 'engine_oil', label: 'Olio', action: 'replace', km: 10000, months: 12, firstKm: 1000, origin: 'preset' }
const read = (date: string, km: number): OdometerReading => ({ id: date, updatedAt: 0, bikeId: 'b', date, km })
const svc = (date: string, km: number): Service => ({ id: date, updatedAt: 0, bikeId: 'b', date, km, itemIds: ['oil'], attachmentIds: [] })

describe('addMonths', () => {
  it('tiene il giorno e si ferma a fine mese', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2026-11-20', 12)).toBe('2027-11-20')
  })
})

describe('kmPerDay', () => {
  it('serve almeno 2 letture negli ultimi 90 giorni', () => {
    expect(kmPerDay([read('2026-11-01', 1000)], '2026-11-20')).toBeUndefined()
    expect(kmPerDay([read('2026-01-01', 0), read('2026-11-01', 1000)], '2026-11-20')).toBeUndefined()
  })
  it('media sulle letture recenti', () => {
    expect(kmPerDay([read('2026-10-01', 1000), read('2026-10-31', 1600)], '2026-11-20')).toBe(20)
  })
})

describe('nextDue', () => {
  it('senza interventi usa firstKm dai km iniziali', () => {
    const d = nextDue(oil, bike, [], [read('2022-03-10', 400)], '2022-03-20', T)
    expect(d.dueKm).toBe(1000)
    expect(d.kmLeft).toBe(600)
    expect(d.status).toBe('ok')
  })
  it('moto usata: ignora il primo tagliando già superato', () => {
    const used = { ...bike, startKm: 23000 }
    expect(nextDue(oil, used, [], [], '2026-11-20', T).dueKm).toBe(33000)
  })
  it("parte dall'ultimo intervento e diventa ambra entro 500 km", () => {
    const d = nextDue(oil, bike, [svc('2026-06-01', 14000), svc('2025-06-01', 4000)], [read('2026-11-01', 23600)], '2026-11-20', T)
    expect(d.dueKm).toBe(24000)
    expect(d.dueDate).toBe('2027-06-01')
    expect(d.status).toBe('warn')
    expect(d.progress).toBeCloseTo(0.96)
  })
  it('la stima in base ai km anticipa la data fissa', () => {
    const readings = [read('2026-10-01', 15000), read('2026-11-01', 18100)]
    const d = nextDue(oil, bike, [svc('2026-06-01', 14000)], readings, '2026-11-01', T)
    // 5.900 km mancanti a 100 km/giorno = 59 giorni
    expect(d.estimatedDate).toBe('2026-12-30')
    expect(d.effectiveDate).toBe('2026-12-30')
    expect(d.status).toBe('ok')
  })
  it('voce corta (catena ogni 600 km): appena fatta torna ok anche viaggiando tanto, ambra solo nel 20% finale', () => {
    const chain: MaintenanceItem = { ...oil, id: 'chain', item: 'chain', km: 600, months: undefined, firstKm: undefined }
    const done = { ...svc('2026-11-20', 23900), itemIds: ['chain'] }
    // 30 km al giorno: la stima cade fra 20 giorni, dentro i 30 della soglia fissa
    const readings = [read('2026-11-10', 23600), read('2026-11-20', 23900)]
    expect(nextDue(chain, bike, [done], readings, '2026-11-20', T).status).toBe('ok')
    expect(nextDue(chain, bike, [done], [...readings, read('2026-11-30', 24400)], '2026-11-30', T).status).toBe('warn')
  })
  it('scaduta quando la data è superata', () => {
    const d = nextDue(oil, bike, [svc('2025-01-01', 14000)], [read('2025-02-01', 15000)], '2026-02-01', T)
    expect(d.status).toBe('overdue')
  })
})

describe('documentStatus', () => {
  const doc = { id: 'd', updatedAt: 0, bikeId: 'b', kind: 'revisione' as const, dueDate: '2026-12-10', attachmentIds: [] }
  it('ambra a 30 giorni, rossa dopo la scadenza, ambra il giorno stesso', () => {
    expect(documentStatus(doc, '2026-11-01', T)).toBe('ok')
    expect(documentStatus(doc, '2026-11-20', T)).toBe('warn')
    expect(documentStatus(doc, '2026-12-10', T)).toBe('warn')
    expect(documentStatus(doc, '2026-12-11', T)).toBe('overdue')
  })
})

describe('ricalcolo dopo correzione km', () => {
  it('ignora le letture cancellate e ricalcola scadenza e km/giorno in base all’ultimo intervento', () => {
    const services = [svc('2026-06-01', 14000)]
    const wrong = { ...read('2026-11-25', 24100), deletedAt: 1700000000000 }
    const earlier = read('2026-10-26', 15000)
    const corrected = read('2026-11-25', 15600)
    expect(currentKm(bike, [earlier, wrong, corrected])).toBe(15600)
    // (15600 - 15000) / 30 giorni = 20 km/giorno
    expect(kmPerDay([earlier, wrong, corrected], '2026-11-25')).toBe(20)
    // Ultimo intervento a 14.000 km -> prossimo a 24.000 km, mancanti 8.400 km -> stato ok (non scaduta!)
    const d = nextDue(oil, bike, services, [earlier, wrong, corrected], '2026-11-25', T)
    expect(d.dueKm).toBe(24000)
    expect(d.kmLeft).toBe(8400)
    expect(d.status).toBe('ok')
  })
})

it('revisione: prima a 4 anni, poi ogni 2', () => {
  expect(nextRevisionYear(2017, 2026)).toBe(2027)
  expect(nextRevisionYear(2017, 2025)).toBe(2025)
  expect(nextRevisionYear(2024, 2026)).toBe(2028)
})
