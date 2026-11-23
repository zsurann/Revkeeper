import type { Id, Service } from './types'

export type ServiceDraft = Omit<Service, 'id' | 'updatedAt' | 'deletedAt' | 'attachmentIds'>

const euro = (f: FormData, k: string) => {
  const raw = String(f.get(k) ?? '').trim()
  if (raw === '') return undefined
  // Con la virgola i punti sono migliaia (1.120,50); senza, un punto seguito da gruppi di 3 cifre è migliaia (1.200), altrimenti decimale (12.50)
  const v = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : /^\d{1,3}(\.\d{3})+$/.test(raw) ? raw.replace(/\./g, '') : raw
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
