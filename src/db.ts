import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { currentKm } from './domain/due'
import type { Attachment, Bike, BikeDocument, Id, MaintenanceItem, OdometerReading, Service } from './domain/types'

type Rec<T> = { key: Id; value: T; indexes: { bikeId: Id } }
interface RevkeeperDB extends DBSchema {
  bikes: { key: Id; value: Bike }
  readings: Rec<OdometerReading>
  items: Rec<MaintenanceItem>
  services: Rec<Service>
  documents: Rec<BikeDocument>
  attachments: { key: Id; value: Attachment }
  meta: { key: string; value: unknown }
}
type ChildStore = 'readings' | 'items' | 'services' | 'documents'
export type StoreName = ChildStore | 'bikes' | 'attachments'
export const STORES: StoreName[] = ['bikes', 'readings', 'items', 'services', 'documents', 'attachments']
type Value<S extends StoreName> = RevkeeperDB[S]['value']
type Draft<S extends StoreName> = Omit<Value<S>, 'id' | 'updatedAt'> & { id?: Id }

let dbp: Promise<IDBPDatabase<RevkeeperDB>> | undefined
export const db = () =>
  (dbp ??= openDB<RevkeeperDB>('revkeeper', 2, {
    upgrade(d, from) {
      if (from < 1) {
        d.createObjectStore('bikes', { keyPath: 'id' })
        d.createObjectStore('attachments', { keyPath: 'id' })
        for (const s of ['readings', 'items', 'services', 'documents'] as const)
          d.createObjectStore(s, { keyPath: 'id' }).createIndex('bikeId', 'bikeId')
      }
      if (from < 2) d.createObjectStore('meta')
    },
  }))

export const getMeta = async <T>(key: string) => (await (await db()).get('meta', key)) as T | undefined
export const setMeta = async (key: string, value: unknown) => void (await (await db()).put('meta', value, key))

// Avvisa il sync che c'è qualcosa da inviare
const changed = () => globalThis.dispatchEvent?.(new Event('revkeeper:changed'))

export const save = async <S extends StoreName>(store: S, draft: Draft<S>): Promise<Value<S>> => {
  const rec = { ...draft, id: draft.id ?? crypto.randomUUID(), updatedAt: Date.now(), dirty: 1 } as Value<S>
  await (await db()).put(store, rec as never)
  changed()
  return rec
}

// Cancellazione logica: il record resta come tombstone per il sync
export const remove = async (store: StoreName, id: Id) => {
  const d = await db()
  const rec = await d.get(store, id)
  if (rec) await d.put(store, { ...rec, deletedAt: Date.now(), updatedAt: Date.now(), dirty: 1 } as never)
  changed()
}

const alive = <T extends { deletedAt?: number }>(rows: T[]) => rows.filter((r) => !r.deletedAt)

export const listBikes = async () => alive(await (await db()).getAll('bikes'))
export const listByBike = async <S extends ChildStore>(store: S, bikeId: Id): Promise<Value<S>[]> =>
  // shortcut: idb non restringe il tipo dell'indice su uno store generico
  alive(await (await db()).getAllFromIndex(store as ChildStore as 'readings', 'bikeId', bikeId)) as Value<S>[]

export class KmDecreasingError extends Error {}

export const addReading = async (bike: Bike, date: string, km: number) => {
  if (!Number.isFinite(km) || km < 0) throw new RangeError('Km non validi')
  const now = currentKm(bike, await listByBike('readings', bike.id))
  if (km < now) throw new KmDecreasingError(`I km non possono scendere sotto ${now}`)
  return save('readings', { bikeId: bike.id, date, km })
}

// Se l'allegato è arrivato dal sync senza file, lo scarica da R2 e lo tiene in cache
export const getAttachment = async (id: Id): Promise<(Attachment & { blob: Blob }) | undefined> => {
  const d = await db()
  const a = await d.get('attachments', id)
  if (!a || a.deletedAt) return undefined
  if (a.blob) return { ...a, blob: a.blob }
  const res = await fetch(`/api/files/${id}`)
  if (!res.ok) return undefined
  const full = { ...a, blob: await res.blob() }
  await d.put('attachments', full)
  return full
}

// Unisce due moto doppie: i record figli passano a `keep`, `drop` diventa un tombstone
export const mergeBikes = async (keep: Id, drop: Id) => {
  for (const s of ['readings', 'items', 'services', 'documents'] as const)
    for (const r of await listByBike(s, drop)) await save(s, { ...r, bikeId: keep } as never)
  await remove('bikes', drop)
}

export const findDuplicateBikes = (bikes: Bike[]) => {
  const key = (b: Bike) => (b.plate ? `${b.make}|${b.model}|${b.plate}`.toLowerCase() : undefined)
  for (const [i, a] of bikes.entries())
    for (const b of bikes.slice(i + 1)) if (key(a) && key(a) === key(b)) return [a, b] as const
  return undefined
}
