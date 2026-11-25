import { CircleDot, ClipboardCheck, Cog, Disc3, Droplet, Landmark, Link2, ShieldCheck, Thermometer, Wind, Wrench, Zap, type LucideIcon } from 'lucide-react'
import type { DocKind } from './domain/types'

// Icona di ogni voce di manutenzione (chiave `item` del catalogo intervalli)
const ITEM: Record<string, LucideIcon> = {
  engine_oil: Droplet,
  oil_filter: Droplet,
  final_drive_oil: Droplet,
  chain: Link2,
  drive_belt: Link2,
  brake_fluid: Disc3,
  valve_clearance: Cog,
  spark_plugs: Zap,
  air_filter: Wind,
  tyres: CircleDot,
  coolant: Thermometer,
}
export const itemIcon = (key: string): LucideIcon => ITEM[key] ?? Wrench

export const DOC: Record<DocKind, { label: string; icon: LucideIcon; hint: string }> = {
  assicurazione: { label: 'Assicurazione', icon: ShieldCheck, hint: 'RC moto' },
  bollo: { label: 'Bollo', icon: Landmark, hint: 'Tassa di possesso' },
  revisione: { label: 'Revisione', icon: ClipboardCheck, hint: 'Controllo periodico' },
}
export const DOC_KINDS: DocKind[] = ['assicurazione', 'bollo', 'revisione']
