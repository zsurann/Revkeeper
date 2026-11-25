import { currentKm } from './due'
import type { Bike, MaintenanceItem, OdometerReading, Service } from './types'

export type Spending = {
  total: number
  byYear: { year: string; total: number }[] // dal più vecchio, anni senza spese compresi
  byItem: { label: string; total: number }[] // dal più costoso; un intervento con più voci si divide in parti uguali
  perKm?: number // euro per km percorso da quando la moto è nel garage
}

// Statistiche delle spese di una moto, solo dagli interventi con un costo
export const spendingStats = (bike: Bike, services: Service[], items: MaintenanceItem[], readings: OdometerReading[]): Spending => {
  const paid = services.filter((s) => !s.deletedAt && (s.costTotal ?? 0) > 0)
  const total = paid.reduce((a, s) => a + s.costTotal!, 0)
  const years = new Map<string, number>()
  const labels = new Map<string, number>()
  for (const s of paid) {
    const y = s.date.slice(0, 4)
    years.set(y, (years.get(y) ?? 0) + s.costTotal!)
    const share = s.costTotal! / Math.max(1, s.itemIds.length)
    for (const id of s.itemIds.length ? s.itemIds : ['']) {
      const label = items.find((i) => i.id === id)?.label ?? 'Altro'
      labels.set(label, (labels.get(label) ?? 0) + share)
    }
  }
  const ys = [...years.keys()].map(Number)
  const byYear = ys.length
    ? Array.from({ length: Math.max(...ys) - Math.min(...ys) + 1 }, (_, i) => {
        const year = String(Math.min(...ys) + i)
        return { year, total: round(years.get(year) ?? 0) }
      })
    : []
  const byItem = [...labels].map(([label, t]) => ({ label, total: round(t) })).sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))
  const ridden = currentKm(bike, readings.filter((r) => !r.deletedAt)) - bike.startKm
  return { total: round(total), byYear, byItem, perKm: ridden > 0 && total > 0 ? round(total / ridden, 3) : undefined }
}

const round = (x: number, digits = 2) => Math.round(x * 10 ** digits) / 10 ** digits
