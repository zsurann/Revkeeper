import { currentKm, daysBetween, nextDue } from '../src/domain/due'
import { DEFAULT_THRESHOLDS, type Bike, type BikeDocument, type MaintenanceItem, type OdometerReading, type Service } from '../src/domain/types'

export type Rec = { kind: string; data: unknown }
const NOTICE_DAYS = [30, 7, 0]
const DOC = { assicurazione: "L'assicurazione", bollo: 'Il bollo', revisione: 'La revisione' } as const
const when = (d: number) => (d === 0 ? 'scade oggi' : `scade tra ${d} giorni`)

// Testi delle notifiche di oggi per un utente, calcolati dai record sincronizzati
export const remindersFor = (records: Rec[], today: string): string[] => {
  const of = <T>(kind: string) => records.filter((r) => r.kind === kind).map((r) => r.data as T)
  const bikes = of<Bike>('bikes')
  const readings = of<OdometerReading>('readings')
  const items = of<MaintenanceItem>('items')
  const services = of<Service>('services')
  const docs = of<BikeDocument>('documents')
  const out: string[] = []
  for (const bike of bikes) {
    const name = `${bike.make} ${bike.model}`
    const r = readings.filter((x) => x.bikeId === bike.id)
    const s = services.filter((x) => x.bikeId === bike.id)
    for (const item of items.filter((x) => x.bikeId === bike.id)) {
      const due = nextDue(item, bike, s, r, today, DEFAULT_THRESHOLDS)
      const days = due.effectiveDate ? daysBetween(today, due.effectiveDate) : undefined
      if (days !== undefined && NOTICE_DAYS.includes(days)) out.push(`${name}: ${item.label} ${when(days)}`)
    }
    for (const d of docs.filter((x) => x.bikeId === bike.id)) {
      const days = daysBetween(today, d.dueDate)
      if (NOTICE_DAYS.includes(days)) out.push(`${name}: ${DOC[d.kind]} ${when(days)}`)
    }
    const last = r.reduce((m, x) => (x.date > m ? x.date : m), bike.startDate)
    const idle = daysBetween(last, today)
    if (idle > 0 && idle % 30 === 0) out.push(`${name}: aggiorna i km (${currentKm(bike, r).toLocaleString('it-IT')} km di ${idle} giorni fa)`)
  }
  return out
}

export const localParts = (now: Date, tz: string) => {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' }).format(now))
  return { date, hour }
}

// Il telefono mostra già "Revkeeper": il titolo è la scadenza, il testo la moto ("Kawasaki Z650: Catena scade tra 7 giorni")
export const pushText = (lines: string[]) => {
  if (lines.length !== 1) return { title: `${lines.length} scadenze in arrivo`, body: lines.join('\n') }
  const i = lines[0]!.indexOf(': ')
  return i < 0 ? { title: lines[0]!, body: '' } : { title: lines[0]!.slice(i + 2).replace(/^./, (c) => c.toUpperCase()), body: lines[0]!.slice(0, i) }
}
