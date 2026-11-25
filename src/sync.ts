import { db, getMeta, setMeta, STORES, type StoreName } from './db'
import { toast } from './toast'

type Change = { kind: StoreName; id: string; data: unknown; updatedAt: number; deleted?: boolean; deviceId?: string }
type Rec = { id: string; updatedAt: number; deletedAt?: number; dirty?: 1; blob?: Blob; uploaded?: 1; type?: string }

const BATCH = 50
const api = async (path: string, init?: RequestInit) => {
  const res = await fetch(`/api${path}`, { ...init, headers: { 'content-type': 'application/json', ...init?.headers } })
  if (res.status === 401) throw new LoggedOut()
  if (!res.ok) throw new Error(`${path}: ${res.status} ${(await res.json().catch(() => ({}))).error ?? ''}`)
  return res.json()
}
export class LoggedOut extends Error {}

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
const REJECTED = new Set([400, 411, 413, 415, 507])

const pushAll = async (device: string) => {
  const d = await db()
  const rejected: string[] = []
  for (const kind of STORES) {
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
      if (!navigator.onLine || !(await getMeta<string>('account'))) return 0
      const device = await deviceId()
      const rejected = await pushAll(device)
      const applied = await pullAll(device)
      await setMeta('lastSync', Date.now())
      if (applied) dispatchEvent(new Event('revkeeper:synced'))
      if (rejected.length) throw new FilesRejected(`Allegati non caricati: ${[...new Set(rejected)].join('; ')}`)
      return applied
    } catch (e) {
      if (e instanceof LoggedOut) {
        await dropLocalPush().catch(() => undefined)
        await clearLocal()
        globalThis.dispatchEvent?.(new Event('revkeeper:loggedout'))
      }
      throw e
    } finally {
      running = undefined
    }
  })())

// Primo accesso: tutto il locale va inviato, poi si scarica tutto dal server
export const startAccount = async (email: string) => {
  const d = await db()
  for (const kind of STORES) for (const r of (await d.getAll(kind)) as Rec[]) await d.put(kind, { ...r, dirty: 1 } as never)
  await setMeta('cursor', 0)
  await setMeta('account', email)
  return syncNow()
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

export const downloadAccountExport = async () => {
  const res = await fetch('/api/account/export')
  if (res.status === 401) throw new LoggedOut()
  if (!res.ok) throw new Error(`Export non riuscito: ${res.status}`)
  const blob = await res.blob()
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
const quiet = (e: unknown) => {
  if (e instanceof FilesRejected && e.message !== warned) {
    warned = e.message
    toast('Alcuni allegati restano sul telefono', { kind: 'warn', body: e.message })
  } else console.warn(e)
}
let timer: ReturnType<typeof setTimeout> | undefined
const later = () => {
  clearTimeout(timer)
  timer = setTimeout(() => void syncNow().catch(quiet), 2000) // debounce: un solo invio per raffica di modifiche
}
export const startAutoSync = () => {
  addEventListener('revkeeper:changed', later)
  addEventListener('online', later)
  void syncNow().catch(quiet)
}
