// Controllo dei record in arrivo dal sync: tipi e dimensioni, prima di scriverli su D1.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE = /^\d{4}-\d{2}-\d{2}$/
const ACTIONS = new Set(['replace', 'inspect', 'adjust', 'lube'])
const ORIGINS = new Set(['model', 'preset', 'user'])
const DOCS = new Set(['assicurazione', 'bollo', 'revisione'])

export const isId = (v: unknown): v is string => typeof v === 'string' && UUID.test(v)

type Obj = Record<string, unknown>
const obj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const miss = (o: Obj, k: string) => !(k in o) || o[k] == null

const str = (o: Obj, k: string, max: number, req = false) => {
  if (miss(o, k)) return req
  const v = o[k]
  return typeof v !== 'string' || v.length < 1 || v.length > max
}
const num = (o: Obj, k: string, max: number, req = false, integer = false) => {
  if (miss(o, k)) return req
  const v = o[k]
  return typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > max || (integer && !Number.isInteger(v))
}
const ident = (o: Obj, k: string, req = false) => (miss(o, k) ? req : !isId(o[k]))
const day = (o: Obj, k: string, req = false) => {
  if (miss(o, k)) return req
  const v = o[k]
  return typeof v !== 'string' || !DATE.test(v) || Number.isNaN(Date.parse(`${v}T00:00:00Z`))
}
const idList = (o: Obj, k: string) => {
  if (miss(o, k)) return true
  const v = o[k]
  return !Array.isArray(v) || v.length > 100 || v.some((x) => !isId(x))
}
const oneOf = (o: Obj, k: string, allowed: Set<string>, req = false) => {
  if (miss(o, k)) return req
  return typeof o[k] !== 'string' || !allowed.has(o[k] as string)
}
const any = (...xs: boolean[]) => xs.some(Boolean)

const pressures = (o: Obj, k: string) => {
  if (miss(o, k)) return false
  const v = o[k]
  return !obj(v) || num(v, 'front', 100) || num(v, 'rear', 100)
}

const bike = (o: Obj) => {
  const year = o.year
  const yearBad = typeof year !== 'number' || !Number.isInteger(year) || year < 1880 || year > 2100
  let nested = false
  if (!miss(o, 'tyres')) {
    const t = o.tyres
    nested = !obj(t) || str(t, 'front', 80) || str(t, 'rear', 80) || pressures(t, 'pressureSolo') || pressures(t, 'pressureDuo')
  }
  if (!miss(o, 'fluids')) {
    const f = o.fluids
    nested ||= !obj(f) || str(f, 'oilType', 80) || str(f, 'oilGrade', 40) || str(f, 'brakeFluid', 80) || str(f, 'sparkPlug', 80) || num(f, 'oilLitres', 100)
  }
  if (!miss(o, 'specs')) {
    const s = o.specs
    nested ||= !obj(s) || num(s, 'cc', 10_000) || num(s, 'hp', 2_000) || num(s, 'kg', 2_000) || num(s, 'tankLitres', 200) || num(s, 'consumption', 100)
  }
  return any(str(o, 'make', 80, true), str(o, 'model', 120, true), yearBad, num(o, 'startKm', 10_000_000, true, true), day(o, 'startDate', true), str(o, 'plate', 32), str(o, 'vin', 32), str(o, 'category', 40), str(o, 'modelRef', 200), ident(o, 'photoId'), nested)
}

const byKind: Record<string, (o: Obj) => boolean> = {
  bikes: bike,
  readings: (o) => any(ident(o, 'bikeId', true), day(o, 'date', true), num(o, 'km', 10_000_000, true, true)),
  items: (o) => any(ident(o, 'bikeId', true), str(o, 'item', 80, true), str(o, 'label', 200, true), oneOf(o, 'action', ACTIONS, true), oneOf(o, 'origin', ORIGINS, true), num(o, 'km', 10_000_000, false, true), num(o, 'months', 1_200, false, true), num(o, 'firstKm', 10_000_000, false, true), str(o, 'notes', 2_000)),
  services: (o) => any(ident(o, 'bikeId', true), day(o, 'date', true), num(o, 'km', 10_000_000, true, true), idList(o, 'itemIds'), idList(o, 'attachmentIds'), str(o, 'notes', 4_000), num(o, 'costTotal', 1e9), num(o, 'costParts', 1e9), num(o, 'costLabour', 1e9)),
  documents: (o) => any(ident(o, 'bikeId', true), oneOf(o, 'kind', DOCS, true), day(o, 'dueDate', true), idList(o, 'attachmentIds')),
  attachments: (o) => any(str(o, 'name', 300, true), str(o, 'type', 120, true), num(o, 'size', 15 * 1024 * 1024, false, true)),
}

// undefined se il record è accettabile
export const recordError = (kind: string, data: unknown, id: string, updatedAt: number): string | undefined => {
  if (!obj(data) || data.id !== id || data.updatedAt !== updatedAt) return 'Record non valido'
  if (typeof data.updatedAt !== 'number' || !Number.isInteger(data.updatedAt)) return 'Record non valido'
  if (!miss(data, 'deletedAt') && num(data, 'deletedAt', 1e14, false, true)) return 'Record non valido'
  const check = byKind[kind]
  if (!check || check(data)) return 'Record non valido'
  return undefined
}
