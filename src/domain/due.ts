import type { Bike, BikeDocument, IsoDate, MaintenanceItem, OdometerReading, Service, Status, Thresholds } from './types'

const DAY = 86_400_000
const toMs = (d: IsoDate) => Date.parse(`${d}T00:00:00Z`)
const toIso = (ms: number): IsoDate => new Date(ms).toISOString().slice(0, 10)
export const daysBetween = (a: IsoDate, b: IsoDate) => Math.round((toMs(b) - toMs(a)) / DAY)

// Aggiunge mesi tenendo il giorno; 31 gen + 1 mese = 28/29 feb
export const addMonths = (d: IsoDate, months: number): IsoDate => {
  const [y, m, day] = d.split('-').map(Number) as [number, number, number]
  const target = new Date(Date.UTC(y, m - 1 + months, 1))
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(day, last))
  return toIso(target.getTime())
}

const addDays = (d: IsoDate, days: number) => toIso(toMs(d) + days * DAY)
const minDate = (a?: IsoDate, b?: IsoDate) => (a && b ? (a < b ? a : b) : (a ?? b))

export const currentKm = (bike: Bike, readings: OdometerReading[]) =>
  readings.reduce((max, r) => Math.max(max, r.km), bike.startKm)

// Media km/giorno sulle letture degli ultimi 90 giorni; serve almeno 2 letture in giorni diversi
export const kmPerDay = (readings: OdometerReading[], today: IsoDate): number | undefined => {
  const recent = readings
    .filter((r) => !r.deletedAt && daysBetween(r.date, today) <= 90 && daysBetween(r.date, today) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date) || a.km - b.km)
  const first = recent[0]
  const last = recent.at(-1)
  if (!first || !last || recent.length < 2) return undefined
  const days = daysBetween(first.date, last.date)
  return days > 0 ? (last.km - first.km) / days : undefined
}

export type Due = {
  dueKm?: number
  kmLeft?: number
  dueDate?: IsoDate
  estimatedDate?: IsoDate
  effectiveDate?: IsoDate
  status: Status
}

const statusOf = (kmLeft: number | undefined, date: IsoDate | undefined, today: IsoDate, t: Thresholds): Status => {
  const daysLeft = date === undefined ? undefined : daysBetween(today, date)
  if ((kmLeft !== undefined && kmLeft <= 0) || (daysLeft !== undefined && daysLeft < 0)) return 'overdue'
  if ((kmLeft !== undefined && kmLeft <= t.warnKm) || (daysLeft !== undefined && daysLeft <= t.warnDays)) return 'warn'
  return 'ok'
}

export const nextDue = (
  item: MaintenanceItem,
  bike: Bike,
  services: Service[],
  readings: OdometerReading[],
  today: IsoDate,
  t: Thresholds,
): Due => {
  const last = services
    .filter((s) => !s.deletedAt && s.itemIds.includes(item.id))
    .sort((a, b) => b.km - a.km || b.date.localeCompare(a.date))[0]
  const base = last ? { km: last.km, date: last.date } : { km: bike.startKm, date: bike.startDate }
  const kmInterval = !last && item.firstKm !== undefined ? item.firstKm : item.km
  const dueKm = kmInterval === undefined ? undefined : base.km + kmInterval
  const dueDate = item.months === undefined ? undefined : addMonths(base.date, item.months)
  const kmLeft = dueKm === undefined ? undefined : dueKm - currentKm(bike, readings)
  const rate = kmPerDay(readings, today)
  const estimatedDate =
    kmLeft !== undefined && rate !== undefined && rate > 0 ? addDays(today, Math.max(0, Math.ceil(kmLeft / rate))) : undefined
  const effectiveDate = minDate(dueDate, estimatedDate)
  return { dueKm, kmLeft, dueDate, estimatedDate, effectiveDate, status: statusOf(kmLeft, effectiveDate, today, t) }
}

export const documentStatus = (doc: BikeDocument, today: IsoDate, t: Thresholds): Status =>
  statusOf(undefined, doc.dueDate, today, t)
