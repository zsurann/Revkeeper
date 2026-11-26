import dataset from '../data/intervals.json'
import type { Action, MaintenanceItem } from './types'

// Schema: issues/research/001-fonte-intervalli-manutenzione.md. km/months a null annullano il valore ereditato.
type Interval = { item: string; action?: Action; km?: number | null; months?: number | null; firstKm?: number | null }
type Preset = { id: string; label: string; extends?: string; intervals: Interval[] }
type Model = Preset & { make: string; model: string; aliases?: string[]; yearFrom: number; yearTo: number | null; source: unknown }
export type Dataset = { items: Record<string, { label: string }>; presets: Preset[]; models: Model[] }

export const DATA = dataset as unknown as Dataset
export const CATEGORIES = DATA.presets.map((p) => ({ id: p.id.replace('preset.', ''), label: p.label }))

const ACTION_LABEL: Record<Action, string> = { replace: 'sostituzione', inspect: 'controllo', adjust: 'regolazione', lube: 'lubrificazione' }

const norm = (s: string) => s.toLowerCase().replace(/[\s\-_]/g, '')

const resolve = (d: Dataset, entry: Preset, seen = new Set<string>()): Map<string, Interval> => {
  if (seen.has(entry.id)) throw new Error(`Ciclo negli intervalli: ${entry.id}`)
  seen.add(entry.id)
  const parent = entry.extends ? d.presets.find((p) => p.id === entry.extends) : undefined
  // Chiave voce+azione: la stessa parte può avere più scadenze (catena: lubrificare e regolare)
  const out = parent ? resolve(d, parent, seen) : new Map<string, Interval>()
  for (const i of entry.intervals) {
    const keys = i.action ? [`${i.item}:${i.action}`] : [...out.keys()].filter((k) => k.startsWith(`${i.item}:`))
    for (const k of keys) out.set(k, { ...out.get(k), ...i })
  }
  return out
}

export type ItemDraft = Omit<MaintenanceItem, 'id' | 'updatedAt' | 'deletedAt'>

export const findModel = (d: Dataset, make: string, model: string, year: number) =>
  d.models.find(
    (m) =>
      norm(m.make) === norm(make) &&
      [m.model, ...(m.aliases ?? [])].some((n) => norm(n) === norm(model)) &&
      m.yearFrom <= year &&
      (m.yearTo === null || year <= m.yearTo),
  )

// Voci di manutenzione per una moto nuova: prima il modello verificato, poi il preset della categoria
export const itemsFor = (
  bike: { id: string; make: string; model: string; year: number; category?: string },
  d: Dataset = DATA,
): ItemDraft[] => {
  const model = findModel(d, bike.make, bike.model, bike.year)
  const preset = d.presets.find((p) => p.id === `preset.${bike.category ?? 'naked'}`) ?? d.presets[0]
  const entry = model ?? preset
  if (!entry) return []
  const list = [...resolve(d, entry).values()].filter((i) => (i.km ?? undefined) !== undefined || (i.months ?? undefined) !== undefined)
  const twice = (item: string) => list.filter((i) => i.item === item).length > 1
  return list.map((i) => ({
      bikeId: bike.id,
      item: i.item,
      label: (d.items[i.item]?.label ?? i.item) + (twice(i.item) || i.action === 'lube' || i.action === 'adjust' ? ` (${ACTION_LABEL[i.action ?? 'inspect']})` : ''),
      action: i.action ?? 'inspect',
      km: i.km ?? undefined,
      months: i.months ?? undefined,
      firstKm: i.firstKm ?? undefined,
      origin: model ? 'model' : 'preset',
    }))
}

// Applica gli intervalli del libretto senza perdere niente: le voci con "valore tipico" si aggiornano al loro posto
// (stesso id, così gli interventi registrati restano collegati), le mancanti si aggiungono,
// quelle personalizzate o già dal libretto restano come sono. Restituisce solo ciò che va salvato.
export const applyManual = (items: MaintenanceItem[], drafts: ItemDraft[]): (ItemDraft | MaintenanceItem)[] =>
  drafts.flatMap((dr) => {
    const old = items.find((i) => !i.deletedAt && i.item === dr.item && i.action === dr.action)
    if (!old) return [dr]
    return old.origin === 'preset' ? [{ ...old, ...dr, notes: old.notes }] : []
  })
