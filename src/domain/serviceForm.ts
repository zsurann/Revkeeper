import type { Id, Service } from './types'

export type ServiceDraft = Omit<Service, 'id' | 'updatedAt' | 'deletedAt' | 'attachmentIds'>

const euro = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? '').trim().replace(/\./g, '').replace(',', '.')
  if (v === '') return undefined
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) throw new RangeError('Importo non valido')
  return Math.round(n * 100) / 100
}

export const serviceFromForm = (f: FormData, bikeId: Id, today: string): ServiceDraft => {
  const date = String(f.get('date') ?? '')
  const km = Number(String(f.get('km') ?? '').trim())
  const itemIds = f.getAll('itemIds').map(String)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today) throw new RangeError('Data non valida o nel futuro')
  if (!Number.isInteger(km) || km < 0) throw new RangeError('Km non validi')
  if (itemIds.length === 0) throw new RangeError('Scegli almeno una voce')
  const costParts = euro(f, 'costParts')
  const costLabour = euro(f, 'costLabour')
  const parts = costParts !== undefined || costLabour !== undefined ? (costParts ?? 0) + (costLabour ?? 0) : undefined
  const notes = String(f.get('notes') ?? '').trim() || undefined
  // Il totale scritto vince; altrimenti è la somma di ricambi e manodopera
  return { bikeId, date, km, itemIds, notes, costParts, costLabour, costTotal: euro(f, 'costTotal') ?? parts }
}

export const MAX_FILE = 15 * 1024 * 1024
export const checkFile = (f: { size: number; type: string }) => {
  if (!f.type.startsWith('image/') && f.type !== 'application/pdf') throw new RangeError('Solo foto o PDF')
  if (f.size > MAX_FILE) throw new RangeError('File oltre 15 MB')
}
