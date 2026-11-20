import type { Bike } from './types'

// Marche curate per il selettore (ricerca 001): il modello resta testo libero
export const BRANDS = [
  'Aprilia', 'Benelli', 'BMW', 'CFMoto', 'Ducati', 'Fantic', 'Harley-Davidson', 'Honda', 'Husqvarna',
  'Kawasaki', 'KTM', 'Kymco', 'Moto Guzzi', 'MV Agusta', 'Piaggio', 'Royal Enfield', 'Suzuki',
  'SYM', 'Triumph', 'Vespa', 'Voge', 'Yamaha',
] as const

export type BikeDraft = Omit<Bike, 'id' | 'updatedAt' | 'deletedAt'>

const text = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? '').trim()
  return v === '' ? undefined : v
}
const num = (f: FormData, k: string) => {
  const v = text(f, k)?.replace(',', '.')
  if (v === undefined) return undefined
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) throw new RangeError(`Valore non valido: ${k}`)
  return n
}
// Toglie i sotto-oggetti rimasti vuoti, così la scheda salva solo ciò che è stato compilato
const compact = <T extends object>(o: T): T | undefined => {
  const entries = Object.entries(o).filter(([, v]) => v !== undefined && (typeof v !== 'object' || Object.keys(v).length))
  return entries.length ? (Object.fromEntries(entries) as T) : undefined
}

export const bikeFromForm = (f: FormData, prev?: Partial<Bike>): BikeDraft => {
  const make = text(f, 'make')
  const model = text(f, 'model')
  const year = num(f, 'year')
  const startKm = num(f, 'startKm')
  if (!make || !model || year === undefined || startKm === undefined) throw new RangeError('Marca, modello, anno e km sono obbligatori')
  return {
    ...prev,
    make,
    model,
    year,
    startKm,
    startDate: prev?.startDate ?? new Date().toISOString().slice(0, 10),
    category: text(f, 'category') ?? prev?.category,
    plate: text(f, 'plate')?.toUpperCase(),
    vin: text(f, 'vin')?.toUpperCase(),
    tyres: compact({
      front: text(f, 'tyreFront'),
      rear: text(f, 'tyreRear'),
      pressureSolo: compact({ front: num(f, 'psFront'), rear: num(f, 'psRear') }),
      pressureDuo: compact({ front: num(f, 'pdFront'), rear: num(f, 'pdRear') }),
    }),
    fluids: compact({
      oilType: text(f, 'oilType'),
      oilGrade: text(f, 'oilGrade'),
      oilLitres: num(f, 'oilLitres'),
      brakeFluid: text(f, 'brakeFluid'),
      sparkPlug: text(f, 'sparkPlug'),
    }),
    specs: compact({
      cc: num(f, 'cc'),
      hp: num(f, 'hp'),
      kg: num(f, 'kg'),
      tankLitres: num(f, 'tankLitres'),
      consumption: num(f, 'consumption'),
    }),
  }
}
