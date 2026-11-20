import { useState, type FormEvent } from 'react'
import { remove, save } from './db'
import { DATA, findModel, itemsFor } from './domain/intervals'
import type { Bike, MaintenanceItem } from './domain/types'
import { Screen, field, ghost, primary } from './ui'

const int = (v: FormDataEntryValue | null) => {
  const s = String(v ?? '').trim()
  if (s === '') return undefined
  const n = Number(s)
  if (!Number.isInteger(n) || n <= 0) throw new RangeError('Usa numeri interi maggiori di zero')
  return n
}
const ORIGIN = { model: 'dal libretto', preset: 'valore tipico', user: 'tua' } as const

const ItemRow = ({ item, onChange }: { item: MaintenanceItem; onChange: () => void }) => {
  const [error, setError] = useState('')
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    try {
      const km = int(f.get('km'))
      const months = int(f.get('months'))
      if (km === undefined && months === undefined) throw new RangeError('Serve almeno km o mesi')
      await save('items', { ...item, km, months, origin: 'user' })
      setError('')
      onChange()
    } catch (err) {
      setError(err instanceof RangeError ? err.message : 'Salvataggio non riuscito')
    }
  }
  return (
    <form onSubmit={submit} className="grid gap-2 rounded-panel bg-panel p-3">
      <div className="flex items-baseline justify-between gap-2">
        <b className="font-gauge">{item.label}</b>
        <span className="text-xs text-dim">{ORIGIN[item.origin]}</span>
      </div>
      <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
        <label className="grid gap-1 text-xs text-dim">ogni km
          <input id={`km-${item.id}`} name="km" inputMode="numeric" pattern="[0-9]*" defaultValue={item.km} className={field} />
        </label>
        <label className="grid gap-1 text-xs text-dim">ogni mesi
          <input id={`months-${item.id}`} name="months" inputMode="numeric" pattern="[0-9]*" defaultValue={item.months} className={field} />
        </label>
        <button className={ghost}>Salva</button>
      </div>
      {error && <p role="alert" className="m-0 text-sm text-red">{error}</p>}
      <button type="button" onClick={() => void remove('items', item.id).then(onChange)} className="justify-self-start text-xs text-dim underline">
        Rimuovi voce
      </button>
    </form>
  )
}

export const Maintenance = ({ bike, items, onChange, onClose }: { bike: Bike; items: MaintenanceItem[]; onChange: () => void; onClose: () => void }) => {
  const [error, setError] = useState('')
  const add = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const f = new FormData(form)
    try {
      const label = String(f.get('label') ?? '').trim()
      const km = int(f.get('km'))
      const months = int(f.get('months'))
      if (!label || (km === undefined && months === undefined)) throw new RangeError('Serve un nome e almeno km o mesi')
      await save('items', { bikeId: bike.id, item: 'custom', label, action: 'inspect', km, months, origin: 'user' })
      form.reset()
      setError('')
      onChange()
    } catch (err) {
      setError(err instanceof RangeError ? err.message : 'Salvataggio non riuscito')
    }
  }
  return (
    <Screen>
      <header className="flex items-center justify-between">
        <h1 className="font-gauge text-2xl">Manutenzioni</h1>
        <button onClick={onClose} className={ghost}>Chiudi</button>
      </header>
      {findModel(DATA, bike.make, bike.model, bike.year) && items.some((i) => i.origin !== 'model') && (
        <button
          onClick={() => void Promise.all(items.map((i) => remove('items', i.id))).then(() => Promise.all(itemsFor(bike).map((i) => save('items', i)))).then(onChange)}
          className={primary}
        >
          Usa gli intervalli del libretto {bike.make} {bike.model}
        </button>
      )}
      <p className="m-0 text-sm text-dim">Ogni voce scade al primo traguardo tra km e mesi. I valori tipici sono indicativi: controlla il libretto della tua moto.</p>
      <div className="grid gap-3">{items.map((i) => <ItemRow key={i.id} item={i} onChange={onChange} />)}</div>
      <form onSubmit={add} className="grid gap-2 rounded-panel border border-dashed border-edge p-3">
        <b className="font-gauge">Nuova voce</b>
        <input id="new-label" name="label" placeholder="Es. Pastiglie freni anteriori" className={field} />
        <div className="grid grid-cols-2 gap-2">
          <input id="new-km" name="km" inputMode="numeric" pattern="[0-9]*" placeholder="ogni km" className={field} />
          <input id="new-months" name="months" inputMode="numeric" pattern="[0-9]*" placeholder="ogni mesi" className={field} />
        </div>
        {error && <p role="alert" className="m-0 text-sm text-red">{error}</p>}
        <button className={primary}>Aggiungi voce</button>
      </form>
    </Screen>
  )
}
