import type { Bike, Id } from './domain/types'
import { Screen, ghost, primary, usePhoto } from './ui'

const Row = ({ bike, km, active, onPick }: { bike: Bike; km: number; active: boolean; onPick: () => void }) => {
  const photo = usePhoto(bike.photoId)
  return (
    <button
      onClick={onPick}
      aria-current={active}
      className={`flex items-center gap-3 rounded-panel bg-panel p-3 text-left ring-amber active:scale-[0.98] ${active ? 'ring-2' : ''}`}
    >
      <div className="grid h-14 w-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-well text-xs text-dim">
        {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : bike.make.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0">
        <div className="truncate font-gauge text-lg">{bike.make} {bike.model}</div>
        <div className="text-sm text-dim">{bike.year} · {km.toLocaleString('it-IT')} km</div>
      </div>
    </button>
  )
}

export const Garage = ({ bikes, kms, activeId, onPick, onAdd, onAccount, onClose }: {
  bikes: Bike[]
  kms: Record<Id, number>
  activeId?: Id
  onPick: (id: Id) => void
  onAdd: () => void
  onAccount: () => void
  onClose: () => void
}) => (
  <Screen>
    <header className="flex items-center justify-between">
      <h1 className="font-gauge text-2xl">Garage</h1>
      <button onClick={onClose} className={ghost}>Chiudi</button>
    </header>
    <div className="grid gap-3">
      {bikes.map((b) => <Row key={b.id} bike={b} km={kms[b.id] ?? b.startKm} active={b.id === activeId} onPick={() => onPick(b.id)} />)}
    </div>
    <button onClick={onAdd} className={primary}>+ Aggiungi moto</button>
    <button onClick={onAccount} className={ghost}>Account e sincronizzazione</button>
  </Screen>
)
