import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { currentKm } from './domain/due'
import { int } from './domain/num'
import type { Attachment, Bike, BikeDocument, Id, MaintenanceItem, OdometerReading, Service } from './domain/types'
import { fullDate } from './format'

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

// Nomi delle voci, anche di quelle eliminate: lo storico degli interventi continua a mostrarle per nome
export const itemLabels = async (bikeId: Id): Promise<Record<Id, string>> =>
  Object.fromEntries((await (await db()).getAllFromIndex('items', 'bikeId', bikeId)).filter((i) => i.label).map((i) => [i.id, i.label]))

export class KmDecreasingError extends Error {}
export class KmBelowServiceError extends Error {}

export const highestService = async (bikeId: Id): Promise<Service | undefined> =>
  (await listByBike('services', bikeId)).sort((a, b) => b.km - a.km || b.date.localeCompare(a.date))[0]

export const addReading = async (bike: Bike, date: string, km: number) => {
  if (!Number.isInteger(km) || km < 0) throw new RangeError('Km non validi')
  const now = currentKm(bike, await listByBike('readings', bike.id))
  if (km < now) throw new KmDecreasingError(`I km non possono scendere sotto ${int(now)}`)
  return save('readings', { bikeId: bike.id, date, km })
}

// Correzione di una lettura sbagliata: rimuove le letture oltre il nuovo valore e ricalcola tutto
export const correctReading = async (bike: Bike, date: string, km: number) => {
  if (!Number.isInteger(km) || km < 0) throw new RangeError('Km non validi')
  const [readings, topService] = await Promise.all([listByBike('readings', bike.id), highestService(bike.id)])
  if (topService && km < topService.km) {
    throw new KmBelowServiceError(
      `I km non possono scendere sotto ${int(topService.km)} km (intervento registrato il ${fullDate(topService.date)}).`,
    )
  }
  const above = readings.filter((r) => r.km > km)
  for (const r of above) await remove('readings', r.id)
  if (km < bike.startKm) await save('bikes', { ...bike, startKm: km })
  const existing = readings.find((r) => r.km === km && r.date === date)
  const reading = existing ?? (await save('readings', { bikeId: bike.id, date, km }))
  return { reading, removedCount: above.length, startKmAdjusted: km < bike.startKm }
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

export type BikeDeleteSummary = {
  services: number
  readings: number
  items: number
  documents: number
  notes: number
  attachments: number
}

const bikeAttachmentIds = (bike: Bike | undefined, services: Service[], documents: BikeDocument[]) => {
  const ids = new Set<Id>()
  if (bike?.photoId) ids.add(bike.photoId)
  for (const s of services) for (const id of s.attachmentIds) ids.add(id)
  for (const d of documents) for (const id of d.attachmentIds) ids.add(id)
  return ids
}

const exclusiveAttachments = async (bikeId: Id): Promise<Id[]> => {
  const d = await db()
  const [bikes, services, documents] = await Promise.all([
    alive(await d.getAll('bikes')),
    alive(await d.getAll('services')),
    alive(await d.getAll('documents')),
  ])
  const targetBike = bikes.find((b) => b.id === bikeId)
  const target = bikeAttachmentIds(
    targetBike,
    services.filter((s) => s.bikeId === bikeId),
    documents.filter((doc) => doc.bikeId === bikeId),
  )
  const usedElsewhere = new Set<Id>()
  for (const b of bikes) if (b.id !== bikeId && b.photoId) usedElsewhere.add(b.photoId)
  for (const s of services) if (s.bikeId !== bikeId) for (const id of s.attachmentIds) usedElsewhere.add(id)
  for (const doc of documents) if (doc.bikeId !== bikeId) for (const id of doc.attachmentIds) usedElsewhere.add(id)
  return [...target].filter((id) => !usedElsewhere.has(id))
}

export const bikeDeleteSummary = async (bikeId: Id): Promise<BikeDeleteSummary> => {
  const [readings, items, services, documents, attachments] = await Promise.all([
    listByBike('readings', bikeId),
    listByBike('items', bikeId),
    listByBike('services', bikeId),
    listByBike('documents', bikeId),
    exclusiveAttachments(bikeId),
  ])
  const notes = items.filter((i) => i.notes?.trim()).length + services.filter((s) => s.notes?.trim()).length
  return {
    services: services.length,
    readings: readings.length,
    items: items.length,
    documents: documents.length,
    notes,
    attachments: attachments.length,
  }
}

// Cancella una moto e tutti i suoi dati locali (tombstone per sync, blob rimossi per liberare spazio)
export const removeBikeCascade = async (bikeId: Id): Promise<{ ids: Record<StoreName, Id[]> }> => {
  const exclusiveAtts = await exclusiveAttachments(bikeId)
  const d = await db()
  const now = Date.now()
  const ids: Record<StoreName, Id[]> = { bikes: [], readings: [], items: [], services: [], documents: [], attachments: [] }
  const tx = d.transaction(STORES, 'readwrite')

  const bike = await tx.objectStore('bikes').get(bikeId)
  if (bike && !bike.deletedAt) {
    await tx.objectStore('bikes').put({ ...bike, deletedAt: now, updatedAt: now, dirty: 1 } as never)
    ids.bikes.push(bikeId)
  }

  for (const store of ['readings', 'items', 'services', 'documents'] as const) {
    const rows = await tx.objectStore(store).index('bikeId').getAll(bikeId)
    for (const r of rows) {
      if (r.deletedAt) continue
      await tx.objectStore(store).put({ ...r, deletedAt: now, updatedAt: now, dirty: 1 } as never)
      ids[store].push(r.id)
    }
  }

  for (const attId of exclusiveAtts) {
    const att = await tx.objectStore('attachments').get(attId)
    if (!att || att.deletedAt) continue
    const { blob: _b, uploaded: _u, ...meta } = att as Attachment & { uploaded?: 1 }
    await tx.objectStore('attachments').put({ ...meta, size: 0, deletedAt: now, updatedAt: now, dirty: 1 } as never)
    ids.attachments.push(attId)
  }

  await tx.done

  if (exclusiveAtts.length && typeof caches !== 'undefined') {
    const urls = new Set(exclusiveAtts.map((id) => `/api/files/${id}`))
    await Promise.all(
      (await caches.keys()).map(async (name) => {
        const cache = await caches.open(name)
        const reqs = await cache.keys()
        await Promise.all(reqs.filter((r) => urls.has(new URL(r.url).pathname)).map((r) => cache.delete(r)))
      }),
    ).catch(() => undefined)
  }

  changed()
  return { ids }
}
