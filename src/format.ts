import type { Due } from './domain/due'

// Data di oggi nel fuso del dispositivo, in formato AAAA-MM-GG
export const today = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)

const n = (x: number) => Math.abs(Math.round(x)).toLocaleString('it-IT')
export const monthYear = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('it-IT', { month: 'short', year: 'numeric', timeZone: 'UTC' })
export const fullDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

// Testo breve a destra: km se la voce ha un intervallo in km, altrimenti la data
export const dueShort = (d: Due) =>
  d.kmLeft !== undefined ? (d.kmLeft > 0 ? `tra ${n(d.kmLeft)} km` : `scaduta da ${n(d.kmLeft)} km`) : d.dueDate ? monthYear(d.dueDate) : ''

export const dueRule = (d: Due) => {
  const parts = [d.dueKm !== undefined && `a ${n(d.dueKm)} km`, d.dueDate && `entro ${monthYear(d.dueDate)}`].filter(Boolean)
  const rule = parts.length === 2 ? `${parts.join(' o ')}, quello che arriva prima` : String(parts[0] ?? '')
  return d.estimatedDate ? `${rule} · stima ${fullDate(d.estimatedDate)}` : rule
}


export const km = (x: number) => `${Math.round(x).toLocaleString('it-IT')} km`
export const eur = (x?: number) => (x === undefined ? '' : x.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }))
export const dayMonth = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', timeZone: 'UTC' })

// "ogni 6.000 km o 12 mesi"
export const every = (i: { km?: number; months?: number }) => {
  const parts = [i.km !== undefined && `${n(i.km)} km`, i.months !== undefined && (i.months === 1 ? '1 mese' : `${i.months} mesi`)].filter(Boolean)
  return parts.length ? `ogni ${parts.join(' o ')}` : ''
}

// "tra 17 giorni", "oggi", "scaduto da 3 giorni"
export const daysText = (days: number, masc = true) =>
  days === 0 ? 'oggi' : days > 0 ? `tra ${days} ${days === 1 ? 'giorno' : 'giorni'}` : `${masc ? 'scaduto' : 'scaduta'} da ${-days} ${days === -1 ? 'giorno' : 'giorni'}`
