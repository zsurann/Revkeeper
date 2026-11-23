import { db, getMeta, setMeta, STORES, type StoreName } from './db'

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

const pushAll = async (device: string) => {
  const d = await db()
  for (const kind of STORES) {
    const dirty = ((await d.getAll(kind)) as Rec[]).filter((r) => r.dirty)
    if (kind === 'attachments')
      for (const a of dirty.filter((a) => a.blob && !a.uploaded && !a.deletedAt)) {
        const res = await fetch(`/api/files/${a.id}`, { method: 'PUT', body: a.blob, headers: { 'content-type': a.type ?? 'application/octet-stream' } })
        if (!res.ok) throw new Error(`Upload ${a.id}: ${res.status} ${(await res.json().catch(() => ({}))).error ?? ''}`)
        a.uploaded = 1
        await d.put('attachments', a as never)
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
}

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
      await pushAll(device)
      const applied = await pullAll(device)
      await setMeta('lastSync', Date.now())
      if (applied) dispatchEvent(new Event('revkeeper:synced'))
      return applied
    } catch (e) {
      if (e instanceof LoggedOut) await setMeta('account', undefined)
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

export const logout = async () => {
  await fetch('/api/auth/logout', { method: 'POST' })
  await setMeta('account', undefined)
}

let timer: ReturnType<typeof setTimeout> | undefined
const later = () => {
  clearTimeout(timer)
  timer = setTimeout(() => void syncNow().catch(console.warn), 2000) // debounce: un solo invio per raffica di modifiche
}
export const startAutoSync = () => {
  addEventListener('revkeeper:changed', later)
  addEventListener('online', later)
  void syncNow().catch(console.warn)
}
