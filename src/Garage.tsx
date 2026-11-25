import { motion } from 'motion/react'
import { Check, Pencil, Plus } from 'lucide-react'
import type { Bike, Id } from './domain/types'
import { km as fmtKm } from './format'
import { list, listItem } from './motion'
import { PageHead, Screen, btn, card, usePhoto } from './ui'

// Targa italiana delle moto: fondo bianco, bordo nero, banda blu a sinistra
export const Plate = ({ plate }: { plate: string }) => (
  <span className="inline-flex h-6 items-stretch overflow-hidden rounded-[5px] bg-white text-[12px] font-bold tracking-[0.06em] text-[#0E1116] ring-1 ring-[#0E1116]/70">
    <span className="grid w-3 place-items-center bg-[#1F4FB4] text-[6px] text-white" aria-hidden="true">I</span>
    <span className="grid place-items-center px-1.5 font-mono">{plate.toUpperCase()}</span>
  </span>
)

const Row = ({ bike, km, active, onPick, onEdit }: { bike: Bike; km: number; active: boolean; onPick: () => void; onEdit: () => void }) => {
  const photo = usePhoto(bike.photoId)
  return (
    <motion.li variants={listItem} className={`${card} relative overflow-hidden ${active ? 'ring-2 ring-ink dark:ring-lime' : ''}`}>
      <button type="button" onClick={onPick} aria-current={active} className="grid w-full text-left">
        <span className="relative block aspect-[16/7] overflow-hidden bg-sunken">
          {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : (
            <span className="grid h-full place-items-center bg-[#0E1116]"><span className="t-display text-[44px] text-[#D4FF3A]/90">{bike.make.slice(0, 2).toUpperCase()}</span></span>
          )}
          {active && <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-lime px-2.5 py-1 text-[12px] font-semibold text-black"><Check size={13} strokeWidth={3} />In uso</span>}
        </span>
        <span className="flex items-center justify-between gap-3 p-4 pr-16">
          <span className="grid min-w-0 gap-1">
            <b className="t-title truncate text-[18px]">{bike.make} {bike.model}</b>
            <span className="flex flex-wrap items-center gap-2 text-[13px] text-ink-3">{bike.plate && <Plate plate={bike.plate} />}{bike.year} · {fmtKm(km)}</span>
          </span>
        </span>
      </button>
      <button type="button" onClick={onEdit} className="absolute bottom-4 right-4 grid size-11 place-items-center rounded-full bg-surface text-ink shadow-1 ring-1 ring-line transition-shadow hover:ring-line-strong active:scale-95" aria-label={`Modifica ${bike.make} ${bike.model}`}><Pencil size={17} /></button>
    </motion.li>
  )
}

export const Garage = ({ bikes, kms, activeId, onPick, onEdit, onAdd, onClose }: {
  bikes: Bike[]
  kms: Record<Id, number>
  activeId?: Id
  onPick: (id: Id) => void
  onEdit: (id: Id) => void
  onAdd: () => void
  onClose: () => void
}) => (
  <Screen>
    <PageHead title="Garage" sub={bikes.length === 1 ? '1 moto' : `${bikes.length} moto`} onBack={onClose} action={<button type="button" onClick={onAdd} className={`${btn.primary} h-11 px-5`}><Plus size={18} strokeWidth={2.6} />Moto</button>} />
    <motion.ul className="m-0 grid list-none gap-4 p-0 lg:grid-cols-2" variants={list} initial="initial" animate="animate">
      {bikes.map((b) => <Row key={b.id} bike={b} km={kms[b.id] ?? b.startKm} active={b.id === activeId} onPick={() => onPick(b.id)} onEdit={() => onEdit(b.id)} />)}
    </motion.ul>
  </Screen>
)
