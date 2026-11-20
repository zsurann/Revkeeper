import { useEffect, useState, type FormEvent } from 'react'
import { addReading, KmDecreasingError, listBikes, listByBike, save } from './db'
import { currentKm } from './domain/due'
import type { Bike } from './domain/types'
import { Odometer } from './Odometer'

const today = () => new Date().toISOString().slice(0, 10)
const field = 'w-full rounded-lg border border-edge bg-panel px-3 py-2.5 text-ink'

// Scheletro dell'MVP: crea la prima moto e aggiorna i km. Le schermate complete arrivano nei ticket successivi.
export const App = () => {
  const [bike, setBike] = useState<Bike>()
  const [km, setKm] = useState<{ now: number; prev?: number }>()
  const [error, setError] = useState('')

  const load = async () => {
    const [first] = await listBikes()
    if (!first) return
    setBike(first)
    const now = currentKm(first, await listByBike('readings', first.id))
    setKm((k) => ({ now, prev: k?.now ?? now - 120 }))
  }
  useEffect(() => void load(), [])

  const addBike = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    await save('bikes', {
      make: String(f.get('make')),
      model: String(f.get('model')),
      year: Number(f.get('year')),
      startKm: Number(f.get('startKm')),
      startDate: today(),
    })
    await load()
  }

  const updateKm = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!bike) return
    const form = e.currentTarget
    try {
      await addReading(bike, today(), Number(new FormData(form).get('km')))
      setError('')
      form.reset()
      await load()
    } catch (err) {
      setError(err instanceof KmDecreasingError || err instanceof RangeError ? err.message : 'Salvataggio non riuscito')
    }
  }

  if (!bike)
    return (
      <main className="mx-auto grid max-w-sm gap-4 px-4 pt-[max(24px,env(safe-area-inset-top))]">
        <h1 className="font-gauge text-2xl">Aggiungi la tua moto</h1>
        <form onSubmit={addBike} className="grid gap-3">
          <input id="make" name="make" required placeholder="Marca (es. Honda)" className={field} />
          <input id="model" name="model" required placeholder="Modello (es. Africa Twin)" className={field} />
          <input id="year" name="year" required type="number" inputMode="numeric" min="1950" max="2100" placeholder="Anno" className={field} />
          <input id="startKm" name="startKm" required type="number" inputMode="numeric" min="0" placeholder="Km attuali" className={field} />
          <button className="rounded-pill bg-amber py-3.5 font-gauge text-amber-ink shadow-fab active:scale-96">Salva moto</button>
        </form>
      </main>
    )

  return (
    <main className="mx-auto grid max-w-sm gap-6 px-4 pt-[max(24px,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between">
        <h1 className="font-gauge text-lg">{bike.make} {bike.model}</h1>
        <span className="rounded-full border border-edge px-2.5 py-1 text-xs text-dim">{bike.year}</span>
      </header>
      {km && <Odometer key={km.now} value={km.now} from={km.prev} />}
      <form onSubmit={updateKm} className="grid gap-2 rounded-panel bg-panel p-4">
        <label htmlFor="km" className="text-sm text-dim">Km letti sul cruscotto</label>
        <div className="flex gap-2">
          <input id="km" name="km" required type="number" inputMode="numeric" min="0" className={field} />
          <button className="shrink-0 rounded-pill bg-amber px-5 font-gauge text-amber-ink shadow-fab active:scale-96">+ Aggiorna km</button>
        </div>
        {error && <p role="alert" className="text-sm text-red">{error}</p>}
      </form>
    </main>
  )
}
