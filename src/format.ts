import type { Due } from './domain/due'
import type { Status } from './domain/types'

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

export const statusText: Record<Status, string> = { ok: '', warn: 'in scadenza', overdue: 'scaduta' }
export const statusColor: Record<Status, string> = { ok: 'text-dim', warn: 'text-amber', overdue: 'text-red' }
