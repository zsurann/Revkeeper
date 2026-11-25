import type { MaintenanceItem, Service } from './types'

export type ServiceFilter = { q?: string; year?: string; itemId?: string }

const norm = (s: string) => s.toLocaleLowerCase('it').normalize('NFD').replace(/\p{M}/gu, '')

// Cerca nelle note e nei nomi delle voci (senza accenti né maiuscole), poi filtra per anno e per voce
export const filterServices = (services: Service[], items: MaintenanceItem[], f: ServiceFilter) => {
  const q = norm(f.q?.trim() ?? '')
  return services.filter((s) => {
    if (f.year && !s.date.startsWith(f.year)) return false
    if (f.itemId && !s.itemIds.includes(f.itemId)) return false
    if (!q) return true
    const labels = s.itemIds.map((id) => items.find((i) => i.id === id)?.label ?? '')
    return [s.notes ?? '', ...labels].some((t) => norm(t).includes(q))
  })
}

export const serviceYears = (services: Service[]) => [...new Set(services.map((s) => s.date.slice(0, 4)))].sort().reverse()
