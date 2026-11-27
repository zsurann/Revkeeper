// D1 e R2 in memoria per i test di handle(). Non entra nel bundle del Worker.
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

type Meta = { changes: number; last_row_id: number }

class Bound {
  constructor(private db: DatabaseSync, private sql: string, private params: unknown[] = []) {}
  bind(...params: unknown[]) {
    return new Bound(this.db, this.sql, params)
  }
  all() {
    const results = this.db.prepare(this.sql).all(...(this.params as never[])).map((r) => ({ ...r }))
    return { success: true, results, meta: {} }
  }
  first<T>() {
    const row = this.db.prepare(this.sql).get(...(this.params as never[])) as Record<string, unknown> | undefined
    return (row ? { ...row } : null) as T | null
  }
  run() {
    const info = this.db.prepare(this.sql).run(...(this.params as never[]))
    const meta: Meta = { changes: Number(info.changes), last_row_id: Number(info.lastInsertRowid) }
    return { success: true, meta }
  }
}

export class FakeD1 {
  private db = new DatabaseSync(':memory:')
  constructor() {
    this.db.exec('PRAGMA foreign_keys = ON')
    const dir = new URL('../../migrations/', import.meta.url)
    for (const name of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) this.db.exec(readFileSync(new URL(name, dir), 'utf8'))
  }
  prepare(sql: string) {
    return new Bound(this.db, sql)
  }
  batch(stmts: Bound[]) {
    this.db.exec('BEGIN')
    try {
      const out = stmts.map((s) => s.run())
      this.db.exec('COMMIT')
      return out
    } catch (e) {
      this.db.exec('ROLLBACK')
      throw e
    }
  }
  exec(sql: string, ...params: unknown[]) {
    return this.prepare(sql).bind(...params).run()
  }
}

type Obj = { body: Uint8Array; type?: string; uploaded: Date }

export class FakeR2 {
  objects = new Map<string, Obj>()
  failPut = false
  now = () => new Date() // data di caricamento dei nuovi oggetti, sovrascrivibile nei test
  async put(key: string, value: ArrayBuffer | ArrayBufferView | Blob | ReadableStream | string | null, opts?: { httpMetadata?: { contentType?: string } }) {
    if (this.failPut) throw new Error('R2 non disponibile')
    const body = value instanceof Uint8Array ? value.slice()
      : value instanceof ArrayBuffer ? new Uint8Array(value)
      : typeof value === 'string' ? new TextEncoder().encode(value)
      : value && typeof (value as Blob).arrayBuffer === 'function' ? new Uint8Array(await (value as Blob).arrayBuffer())
      : value instanceof ReadableStream ? new Uint8Array(await new Response(value).arrayBuffer())
      : new Uint8Array()
    this.objects.set(key, { body, type: opts?.httpMetadata?.contentType, uploaded: this.now() })
  }
  async get(key: string) {
    const o = this.objects.get(key)
    if (!o) return null
    const body = o.body
    return {
      key,
      httpMetadata: { contentType: o.type },
      body: new ReadableStream({ start(c) { c.enqueue(body); c.close() } }),
      arrayBuffer: async () => body.slice().buffer,
    }
  }
  async delete(keys: string | string[]) {
    for (const k of Array.isArray(keys) ? keys : [keys]) this.objects.delete(k)
  }
  async list(opts?: { prefix?: string; cursor?: string; limit?: number }) {
    const all = [...this.objects.keys()].filter((k) => !opts?.prefix || k.startsWith(opts.prefix)).sort()
    const start = opts?.cursor ? all.indexOf(opts.cursor) + 1 : 0
    const slice = all.slice(start, start + (opts?.limit ?? 1000))
    const truncated = start + slice.length < all.length
    return { objects: slice.map((key) => ({ key, uploaded: this.objects.get(key)!.uploaded })), delimitedPrefixes: [] as string[], truncated, ...(truncated ? { cursor: slice.at(-1)! } : {}) }
  }
}
