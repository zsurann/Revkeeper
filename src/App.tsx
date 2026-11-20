import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { BikeForm } from './BikeForm'
import { addReading, KmDecreasingError, listBikes, listByBike } from './db'
import { currentKm } from './domain/due'
import type { Bike, Id } from './domain/types'
import { Garage } from './Garage'
import { Odometer } from './Odometer'
import { Screen, field, ghost, primary } from './ui'

const today = () => new Date().toISOString().slice(0, 10)
const ACTIVE = 'revkeeper.activeBike'
const readActive = () => {
  try { return localStorage.getItem(ACTIVE) ?? undefined } catch { return undefined }
}
const writeActive = (id: Id) => {
  try { localStorage.setItem(ACTIVE, id) } catch { /* preferenza per dispositivo, non critica */ }
}

type View = 'home' | 'garage' | 'new' | 'edit'

export const App = () => {
  const [bikes, setBikes] = useState<Bike[]>()
  const [kms, setKms] = useState<Record<Id, number>>({})
  const [activeId, setActiveId] = useState(readActive)
  const [view, setView] = useState<View>('home')
  const [prevKm, setPrevKm] = useState<number>()
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const all = await listBikes()
    const entries = await Promise.all(all.map(async (b) => [b.id, currentKm(b, await listByBike('readings', b.id))] as const))
    setKms(Object.fromEntries(entries))
    setBikes(all)
  }, [])
  useEffect(() => void load(), [load])

  const bike = bikes?.find((b) => b.id === activeId) ?? bikes?.[0]
  const km = bike ? (kms[bike.id] ?? bike.startKm) : 0

  const pick = (id: Id) => {
    writeActive(id)
    setActiveId(id)
    setPrevKm(undefined)
    setView('home')
  }

  const updateKm = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!bike) return
    const form = e.currentTarget
    try {
      await addReading(bike, today(), Number(new FormData(form).get('km')))
      setPrevKm(km)
      setError('')
      form.reset()
      await load()
    } catch (err) {
      setError(err instanceof KmDecreasingError || err instanceof RangeError ? err.message : 'Salvataggio non riuscito')
    }
  }

  const saved = async (b: Bike) => {
    await load()
    pick(b.id)
  }

  if (!bikes) return null
  if (!bike || view === 'new') return <BikeForm onDone={saved} onCancel={bike ? () => setView('garage') : undefined} />
  if (view === 'edit') return <BikeForm bike={bike} onDone={saved} onCancel={() => setView('home')} />
  if (view === 'garage')
    return <Garage bikes={bikes} kms={kms} activeId={bike.id} onPick={pick} onAdd={() => setView('new')} onClose={() => setView('home')} />

  return (
    <Screen>
      <header className="flex items-center justify-between gap-3">
        <button onClick={() => setView('edit')} className="min-w-0 truncate text-left font-gauge text-lg">
          {bike.make} {bike.model}
        </button>
        <button onClick={() => setView('garage')} className={ghost}>
          {bikes.length === 1 ? 'Garage' : `${bikes.length} moto`}
        </button>
      </header>
      <Odometer key={`${bike.id}-${km}`} value={km} from={prevKm ?? km - 120} />
      <form onSubmit={updateKm} className="grid gap-2 rounded-panel bg-panel p-4">
        <label htmlFor="km" className="text-sm text-dim">Km letti sul cruscotto</label>
        <div className="flex gap-2">
          <input id="km" name="km" required type="number" inputMode="numeric" min="0" className={field} />
          <button className={`shrink-0 ${primary}`}>+ Aggiorna km</button>
        </div>
        {error && <p role="alert" className="text-sm text-red">{error}</p>}
      </form>
    </Screen>
  )
}
