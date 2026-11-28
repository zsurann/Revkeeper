import { db, getMeta, removeBikeCascade, setMeta, STORES, type StoreName } from './db'
import type { Id } from './domain/types'
import { toast } from './toast'
import { zipStoreStream, type ZipEntry } from '../server/zip'

type Change = { kind: StoreName; id: string; data: unknown; updatedAt: number; deleted?: boolean; deviceId?: string }
type Rec = { id: string; updatedAt: number; deletedAt?: number; dirty?: 1; blob?: Blob; uploaded?: 1; type?: string }

const BATCH = 50
const api = async (path: string, init?: RequestInit) => {
  const res = await fetch(`/api${path}`, { ...init, headers: { 'content-type': 'application/json', ...init?.headers } })
  if (res.status === 401) throw new LoggedOut()
  if (res.status === 413 && path === '/sync/push') throw new RecordsFull(String((await res.json().catch(() => ({}))).error ?? 'Limite di record raggiunto'))
  if (!res.ok) throw new Error(`${path}: ${res.status} ${(await res.json().catch(() => ({}))).error ?? ''}`)
  return res.json()
}
export class LoggedOut extends Error {}
export class RecordsFull extends Error {}

const deviceId = async () => {
  let id = await getMeta<string>('deviceId')
  if (!id) await setMeta('deviceId', (id = crypto.randomUUID()))
  return id
}

// Il server riceve il record senza i campi locali (blob, dirty, uploaded)
const toChange = (kind: StoreName, r: Rec): Change => {
  const { blob: _b, dirty: _d, uploaded: _u, ...data } = r
  return { kind, id: r.id, data: r.deletedAt ? null : data, updatedAt: r.updatedAt, deleted: !!r.deletedAt }
}

// File che il server rifiuta per sempre (troppo grande, spazio esaurito, tipo non valido): riprovare non serve
const REJECTED = new Set([400, 403, 411, 413, 415, 507])

const pushAll = async (device: string) => {
  const d = await db()
  const rejected: string[] = []
  // Ospite: gli allegati restano sul telefono (ai promemoria non servono) e partono al login Google
  const guest = !(await getMeta<string>('account'))
  for (const kind of STORES) {
    if (guest && kind === 'attachments') continue
    let dirty = ((await d.getAll(kind)) as Rec[]).filter((r) => r.dirty)
    if (kind === 'attachments') {
      const held = new Set<string>()
      for (const a of dirty.filter((a) => a.blob && !a.uploaded && !a.deletedAt)) {
        const res = await fetch(`/api/files/${a.id}`, { method: 'PUT', body: a.blob, headers: { 'content-type': a.type ?? 'application/octet-stream' } })
        if (res.status === 401) throw new LoggedOut()
        const why = res.ok ? '' : String((await res.json().catch(() => ({}))).error ?? '')
        // Un file rifiutato resta sul telefono e non blocca il resto: prima un solo allegato troppo grande
        // fermava ogni sincronizzazione, e il telefono non riceveva più le modifiche degli altri
        if (REJECTED.has(res.status)) {
          held.add(a.id)
          rejected.push(why || `${(a as { name?: string }).name ?? 'Allegato'}: errore ${res.status}`)
          continue
        }
        if (!res.ok) throw new Error(`Upload ${a.id}: ${res.status} ${why}`)
        a.uploaded = 1
        await d.put('attachments', a as never)
      }
      dirty = dirty.filter((a) => !held.has(a.id)) // senza file sul server, il record non va inviato
    }
    for (let i = 0; i < dirty.length; i += BATCH) {
      const batch = dirty.slice(i, i + BATCH)
      await api('/sync/push', { method: 'POST', body: JSON.stringify({ deviceId: device, changes: batch.map((r) => toChange(kind, r)) }) })
      const tx = d.transaction(kind, 'readwrite')
      for (const r of batch) {
        const now = (await tx.store.get(r.id)) as Rec | undefined
        if (now && now.updatedAt === r.updatedAt) await tx.store.put({ ...now, dirty: undefined } as never) // non toccare chi è cambiato nel frattempo
      }
      await tx.done
    }
  }
  return rejected
}

export class FilesRejected extends Error {}

// Stessa regola del server: vince l'orario più recente; a pari orario la copia del server è già la vincitrice,
// salvo una modifica locale non ancora inviata, che vince se il suo deviceId è più grande (come farà il server)
export const keepLocal = (local: Pick<Rec, 'updatedAt' | 'dirty'> | undefined, c: Pick<Change, 'updatedAt' | 'deviceId'>, device: string) =>
  !!local && (local.updatedAt > c.updatedAt || (local.updatedAt === c.updatedAt && !!local.dirty && device >= (c.deviceId ?? '')))

const pullAll = async (device: string) => {
  const d = await db()
  let applied = 0
  for (;;) {
    const since = (await getMeta<number>('cursor')) ?? 0
    const page = (await api(`/sync/pull?since=${since}`)) as { changes: Change[]; cursor: number; more: boolean }
    for (const c of page.changes) {
      const local = (await d.get(c.kind, c.id)) as Rec | undefined
      if (keepLocal(local, c, device)) continue
      const base = c.deleted ? { ...local, id: c.id, deletedAt: c.updatedAt } : (c.data as Rec)
      await d.put(c.kind, { ...base, updatedAt: c.updatedAt, dirty: undefined, blob: local?.blob, uploaded: c.kind === 'attachments' ? 1 : undefined } as never)
      applied++
    }
    await setMeta('cursor', page.cursor)
    if (!page.more) return applied
  }
}

let running: Promise<number> | undefined
export const syncNow = () =>
  (running ??= (async () => {
    try {
      if (!navigator.onLine || !((await getMeta<string>('account')) || (await getMeta<boolean>('guest')))) return 0
      const device = await deviceId()
      const rejected = await pushAll(device)
      const applied = await pullAll(device)
      await setMeta('lastSync', Date.now())
      if (applied) dispatchEvent(new Event('revkeeper:synced'))
      if (rejected.length) throw new FilesRejected(`Allegati non caricati: ${[...new Set(rejected)].join('; ')}`)
      return applied
    } catch (e) {
      if (e instanceof LoggedOut && (await getMeta<boolean>('guest'))) {
        // Ospite scaduto: i dati restano sul telefono, le notifiche ripartono con un nuovo ospite
        await setMeta('guest', false)
        globalThis.dispatchEvent?.(new Event('revkeeper:guestexpired'))
        return 0
      }
      if (e instanceof LoggedOut) await sessionLost()
      throw e
    } finally {
      running = undefined
    }
  })())

// Sessione scaduta o sconosciuta (anche dopo un ripristino del server): i dati restano sul telefono, comprese
// le modifiche non inviate. Si torna "senza account"; al prossimo accesso con Google il telefono reinvia tutto.
const sessionLost = async () => {
  await dropLocalPush().catch(() => undefined)
  await setMeta('account', undefined)
  await setMeta('guest', false)
  globalThis.dispatchEvent?.(new Event('revkeeper:loggedout'))
  toast('Accesso scaduto', { kind: 'warn', body: 'I dati restano su questo telefono: accedi di nuovo da Account per sincronizzarli' })
}

// Primo accesso: tutto il locale va inviato, poi si scarica tutto dal server.
// Anche i file: quelli caricati da ospite il server li cancella al passaggio all'account Google.
const markAllDirty = async () => {
  const d = await db()
  for (const kind of STORES)
    for (const r of (await d.getAll(kind)) as Rec[]) await d.put(kind, { ...r, dirty: 1, ...(kind === 'attachments' && r.blob ? { uploaded: undefined } : {}) } as never)
  await setMeta('cursor', 0)
}
export const startAccount = async (email: string) => {
  await markAllDirty()
  await setMeta('guest', false)
  await setMeta('account', email)
  return syncNow()
}

// Notifiche senza Google: un account anonimo sul server, che riceve i dati per calcolare i promemoria
export const ensureSession = async () => {
  if ((await getMeta<string>('account')) || (await getMeta<boolean>('guest'))) return
  const res = await fetch('/api/auth/guest', { method: 'POST' })
  if (!res.ok) throw new Error(res.status === 429 ? 'Troppi tentativi: riprova tra qualche minuto' : 'Server non raggiungibile: riprova')
  await markAllDirty()
  await setMeta('guest', true)
  await syncNow()
}

// Modifiche locali non ancora arrivate al server: uscendo andrebbero perse
export const unsynced = async () => {
  const d = await db()
  let n = 0
  for (const kind of STORES) n += ((await d.getAll(kind)) as Rec[]).filter((r) => r.dirty).length
  return n
}

const clearPush = async () => {
  const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  await fetch('/api/push/unsubscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) })
  await sub.unsubscribe()
}
const dropLocalPush = async () => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  await sub?.unsubscribe().catch(() => undefined)
}
const clearLocal = async () => {
  const d = await db()
  for (const s of [...STORES, 'meta'] as const) await d.clear(s)
  try {
    localStorage.removeItem('revkeeper.welcomed')
    localStorage.removeItem('revkeeper.activeBike')
  } catch { /* ignore */ }
}
const endSession = async (path: string) => {
  await clearPush()
  // Senza rete si ferma prima di cancellare, così non resta un telefono vuoto con la sessione ancora aperta.
  const res = await fetch(path, { method: 'POST' })
  if (!res.ok && res.status !== 401) throw new Error(`Uscita non riuscita: ${res.status}`)
  await clearLocal()
}

// Uscita: notifiche di questo telefono disattivate, sessione chiusa, poi il telefono torna vuoto.
export const logout = () => endSession('/api/auth/logout')

// Chiude l'accesso su tutti i telefoni. Le notifiche degli altri dispositivi restano finché non le disattivano.
export const logoutAll = () => endSession('/api/auth/logout-all')

export const deleteAccount = async () => {
  const res = await fetch('/api/account/delete', { method: 'POST' })
  if (!res.ok && res.status !== 401) throw new Error(`Eliminazione non riuscita: ${res.status}`)
  await clearPush()
  await clearLocal()
}

// Ospite: cancella la copia anonima sul server (promemoria compresi), i dati sul telefono restano
export const deleteGuestCopy = async () => {
  await clearPush().catch(() => undefined)
  const res = await fetch('/api/account/delete', { method: 'POST' })
  if (!res.ok && res.status !== 401) throw new Error(`Eliminazione non riuscita: ${res.status}`)
  await setMeta('guest', false)
}

export const deleteBikeEverywhere = async (bikeId: Id): Promise<{ synced: boolean }> => {
  const removed = await removeBikeCascade(bikeId)
  const account = await getMeta<string>('account')
  if (!account || !navigator.onLine) return { synced: false }
  let res: Response
  try {
    res = await fetch(`/api/bikes/${bikeId}`, { method: 'DELETE' })
  } catch {
    // Rete assente o instabile: i tombstone locali restano con dirty=1 e partiranno col sync
    return { synced: false }
  }
  if (res.status === 401) {
    await sessionLost()
    throw new LoggedOut()
  }
  if (!res.ok && res.status !== 404) {
    // Anche in caso di errore temporaneo del server, i tombstone locali sono in coda per il sync
    return { synced: false }
  }
  // Il server ha già cancellato la moto e i file su R2: togliamo il flag dirty dai tombstone locali
  const d = await db()
  for (const kind of STORES) {
    const ids = removed.ids[kind]
    if (!ids.length) continue
    const tx = d.transaction(kind, 'readwrite')
    for (const id of ids) {
      const cur = (await tx.store.get(id)) as Rec | undefined
      if (cur && cur.deletedAt) await tx.store.put({ ...cur, dirty: undefined } as never)
    }
    await tx.done
  }
  return { synced: true }
}

// ZIP con dati.json e i file, composto qui: il server dà i dati, i file arrivano uno per uno da /api/files
export const buildAccountExport = async (get: typeof fetch = fetch) => {
  const res = await get('/api/account/export')
  if (res.status === 401) throw new LoggedOut()
  if (!res.ok) throw new Error(`Export non riuscito: ${res.status}`)
  const dati = (await res.json()) as { files?: { id: string; path: string }[] }
  async function* entries(): AsyncGenerator<ZipEntry> {
    yield { name: 'dati.json', data: new TextEncoder().encode(JSON.stringify(dati, null, 2)) }
    for (const f of dati.files ?? []) {
      const r = await get(`/api/files/${f.id}`)
      if (!r.ok) throw new Error(`Export non riuscito: file ${f.path} (${r.status})`)
      yield { name: f.path, data: new Uint8Array(await r.arrayBuffer()) }
    }
  }
  return new Response(zipStoreStream(entries())).blob()
}

export const downloadAccountExport = async () => {
  const blob = new Blob([await buildAccountExport()], { type: 'application/zip' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'revkeeper-dati.zip'
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

// In automatico gli errori restano in console, tranne i file rifiutati: lì serve che la persona lo sappia (una volta)
let warned = ''
// Errore temporaneo (rete, 5xx, 429): si riprova da soli con attesa crescente, da 30 s fino a 15 minuti
let delay = 0
let retry: ReturnType<typeof setTimeout> | undefined
const quiet = (e: unknown) => {
  if ((e instanceof FilesRejected || e instanceof RecordsFull) && e.message !== warned) {
    warned = e.message
    toast(e instanceof RecordsFull ? 'Dati non salvati online' : 'Alcuni allegati restano sul telefono', { kind: 'warn', body: e.message })
  } else console.warn(e)
  if (e instanceof LoggedOut || e instanceof FilesRejected || e instanceof RecordsFull) return
  delay = Math.min(delay ? delay * 2 : 30_000, 900_000)
  clearTimeout(retry)
  retry = setTimeout(() => void run(), delay)
}
const run = () =>
  syncNow().then(() => {
    delay = 0
    clearTimeout(retry)
  }, quiet)
let timer: ReturnType<typeof setTimeout> | undefined
const later = () => {
  clearTimeout(timer)
  timer = setTimeout(() => void run(), 2000) // debounce: un solo invio per raffica di modifiche
}
export const startAutoSync = () => {
  addEventListener('revkeeper:changed', later)
  addEventListener('online', later)
  // App di nuovo in primo piano: le modifiche fatte da un altro telefono arrivano subito
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && later())
  void run()
}
