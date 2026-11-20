// Modello dati: vedi issues/004-modello-dati.md. Date come stringhe 'YYYY-MM-DD'.
export type Id = string
export type IsoDate = string

// updatedAt/deletedAt servono al sync last-write-wins (issues/010-strategia-sync.md)
type Meta = { id: Id; updatedAt: number; deletedAt?: number; dirty?: 1 }

export type Bike = Meta & {
  make: string
  model: string
  year: number
  plate?: string
  vin?: string
  photoId?: Id
  startKm: number
  startDate: IsoDate
  modelRef?: string
  category?: string
  tyres?: {
    front?: string
    rear?: string
    pressureSolo?: { front?: number; rear?: number }
    pressureDuo?: { front?: number; rear?: number }
  }
  fluids?: { oilType?: string; oilGrade?: string; oilLitres?: number; brakeFluid?: string; sparkPlug?: string }
  specs?: { cc?: number; hp?: number; kg?: number; tankLitres?: number; consumption?: number }
}

export type OdometerReading = Meta & { bikeId: Id; date: IsoDate; km: number }

export type Action = 'replace' | 'inspect' | 'adjust' | 'lube'

export type MaintenanceItem = Meta & {
  bikeId: Id
  item: string
  label: string
  action: Action
  km?: number
  months?: number
  firstKm?: number
  origin: 'model' | 'preset' | 'user'
}

export type Service = Meta & {
  bikeId: Id
  date: IsoDate
  km: number
  itemIds: Id[]
  notes?: string
  costTotal?: number
  costParts?: number
  costLabour?: number
  attachmentIds: Id[]
}

export type DocKind = 'assicurazione' | 'bollo' | 'revisione'

export type BikeDocument = Meta & { bikeId: Id; kind: DocKind; dueDate: IsoDate; attachmentIds: Id[] }

// blob assente = presente solo online, si scarica quando serve; uploaded = già su R2
export type Attachment = Meta & { name: string; type: string; size?: number; blob?: Blob; uploaded?: 1 }

export type Thresholds = { warnKm: number; warnDays: number }
export const DEFAULT_THRESHOLDS: Thresholds = { warnKm: 500, warnDays: 30 }

export type Status = 'ok' | 'warn' | 'overdue'
