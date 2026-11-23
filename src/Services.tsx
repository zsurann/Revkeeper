import { useState, type FormEvent } from 'react'
import { AttachmentLink, AttachmentPicker, usePending } from './Attachments'
import { addReading, remove, save } from './db'
import { serviceFromForm } from './domain/serviceForm'
import type { Bike, MaintenanceItem, Service } from './domain/types'
import { fullDate, today } from './format'
import { Field, field, ghost, primary } from './ui'

const eur = (n?: number) => (n === undefined ? '' : n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }))

const ServiceForm = ({ bike, km, items, onDone }: { bike: Bike; km: number; items: MaintenanceItem[]; onDone: () => void }) => {
  const [error, setError] = useState('')
  const files = usePending()
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      const draft = serviceFromForm(new FormData(e.currentTarget), bike.id, today())
      const attachmentIds = await files.persist()
      await save('services', { ...draft, attachmentIds })
      if (draft.km > km) await addReading(bike, draft.date, draft.km) // l'intervento aggiorna anche il contachilometri
      onDone()
    } catch (err) {
      setError(err instanceof RangeError ? err.message : 'Salvataggio non riuscito')
    }
  }
  return (
    <form onSubmit={submit} className="grid gap-3 rounded-panel bg-panel p-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Data"><input id="svc-date" name="date" type="date" required max={today()} defaultValue={today()} className={field} /></Field>
        <Field label="Km"><input id="svc-km" name="km" required inputMode="numeric" pattern="[0-9]*" defaultValue={km} className={field} /></Field>
      </div>
      <fieldset className="m-0 grid gap-1.5 border-0 p-0">
        <legend className="mb-1 text-sm text-dim">Cosa è stato fatto</legend>
        {items.map((i) => (
          <label key={i.id} className="flex items-center gap-2.5 py-1">
            <input type="checkbox" name="itemIds" value={i.id} className="h-5 w-5 accent-amber" />
            {i.label}
          </label>
        ))}
      </fieldset>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Ricambi €"><input id="svc-parts" name="costParts" inputMode="decimal" className={field} /></Field>
        <Field label="Manodopera €"><input id="svc-labour" name="costLabour" inputMode="decimal" className={field} /></Field>
        <Field label="Totale €"><input id="svc-total" name="costTotal" inputMode="decimal" className={field} /></Field>
      </div>
      <Field label="Note"><textarea id="svc-notes" name="notes" rows={2} className={field} /></Field>
      <AttachmentPicker id="svc-files" p={files} />
      {error && <p role="alert" className="m-0 text-sm text-red">{error}</p>}
      <button className={primary}>Salva intervento</button>
    </form>
  )
}

export const Services = ({ bike, km, items, services, onChange }: {
  bike: Bike
  km: number
  items: MaintenanceItem[]
  services: Service[]
  onChange: () => void
}) => {
  const [adding, setAdding] = useState(false)
  const label = (id: string) => items.find((i) => i.id === id)?.label ?? 'Voce rimossa'
  const sorted = [...services].sort((a, b) => b.date.localeCompare(a.date) || b.km - a.km)
  const spent = services.reduce((s, x) => s + (x.costTotal ?? 0), 0)
  return (
    <>
      <header className="flex items-center justify-between">
        <h1 className="font-gauge text-2xl">Interventi</h1>
        {!adding && <button onClick={() => setAdding(true)} className={primary}>+ Registra</button>}
      </header>
      {adding && <ServiceForm bike={bike} km={km} items={items} onDone={() => { setAdding(false); onChange() }} />}
      {sorted.length === 0 && !adding && <p className="text-dim">Nessun intervento registrato. Registra il prossimo tagliando per far ripartire i conteggi.</p>}
      {spent > 0 && <p className="m-0 text-sm text-dim">Speso in totale: <span className="text-ink">{eur(spent)}</span></p>}
      <ul className="m-0 grid list-none gap-3 p-0">
        {sorted.map((s) => (
          <li key={s.id} className="grid gap-1.5 rounded-panel bg-panel p-4">
            <div className="flex justify-between gap-3">
              <b className="font-gauge">{fullDate(s.date)}</b>
              <span className="text-dim">{s.km.toLocaleString('it-IT')} km</span>
            </div>
            <div className="text-sm">{s.itemIds.map(label).join(', ')}</div>
            {s.costTotal !== undefined && (
              <div className="text-sm text-dim">
                {eur(s.costTotal)}
                {s.costParts !== undefined && ` · ricambi ${eur(s.costParts)}`}
                {s.costLabour !== undefined && ` · manodopera ${eur(s.costLabour)}`}
              </div>
            )}
            {s.notes && <p className="m-0 text-sm text-dim">{s.notes}</p>}
            <div className="flex flex-wrap gap-3">{s.attachmentIds.map((id) => <AttachmentLink key={id} id={id} />)}</div>
            <button onClick={() => void remove('services', s.id).then(onChange)} className="justify-self-start text-xs text-dim underline">Elimina</button>
          </li>
        ))}
      </ul>
      {adding && <button onClick={() => setAdding(false)} className={ghost}>Annulla</button>}
    </>
  )
}
