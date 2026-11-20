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
}
type ChildStore = 'readings' | 'items' | 'services' | 'documents'
type StoreName = ChildStore | 'bikes' | 'attachments'
type Value<S extends StoreName> = RevkeeperDB[S]['value']
type Draft<S extends StoreName> = Omit<Value<S>, 'id' | 'updatedAt'> & { id?: Id }

let dbp: Promise<IDBPDatabase<RevkeeperDB>> | undefined
export const db = () =>
  (dbp ??= openDB<RevkeeperDB>('revkeeper', 1, {
    upgrade(d) {
      d.createObjectStore('bikes', { keyPath: 'id' })
      d.createObjectStore('attachments', { keyPath: 'id' })
      for (const s of ['readings', 'items', 'services', 'documents'] as const)
        d.createObjectStore(s, { keyPath: 'id' }).createIndex('bikeId', 'bikeId')
    },
  }))

export const save = async <S extends StoreName>(store: S, draft: Draft<S>): Promise<Value<S>> => {
  const rec = { ...draft, id: draft.id ?? crypto.randomUUID(), updatedAt: Date.now() } as Value<S>
  await (await db()).put(store, rec as never)
  return rec
}

// Cancellazione logica: il record resta come tombstone per il sync
export const remove = async (store: StoreName, id: Id) => {
  const d = await db()
  const rec = await d.get(store, id)
  if (rec) await d.put(store, { ...rec, deletedAt: Date.now(), updatedAt: Date.now() } as never)
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

export const getAttachment = async (id: Id) => {
  const a = await (await db()).get('attachments', id)
  return a?.deletedAt ? undefined : a
}
