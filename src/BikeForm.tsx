import { useState, type FormEvent, type ReactNode } from 'react'
import { save } from './db'
import { Combobox } from './Combobox'
import { bikeFromForm } from './domain/bikeForm'
import { brands, modelsOf, specsOf, yearsOf } from './domain/catalog'
import type { Spec } from './domain/catalogBuild'
import { BRAKE_FLUIDS, OIL_GRADES, OIL_TYPES, TYRES } from './domain/parts'
import type { Bike } from './domain/types'
import { CATEGORIES } from './domain/intervals'
import { PhotoEditor } from './PhotoEditor'
import { Field, Screen, field, ghost, primary, usePhoto } from './ui'

const Group = ({ title, children, open }: { title: string; children: ReactNode; open?: boolean }) => (
  <details open={open} className="rounded-panel bg-panel p-4 [&_summary]:cursor-pointer">
    <summary className="font-gauge text-lg">{title}</summary>
    <div className="mt-3 grid grid-cols-2 gap-3">{children}</div>
  </details>
)

// type="text" perché type="number" rifiuta la virgola decimale delle tastiere italiane
const Num = ({ name, label, value, decimal }: { name: string; label: string; value?: number; decimal?: boolean }) => (
  <Field label={label}>
    <input
      id={name}
      name={name}
      inputMode={decimal ? 'decimal' : 'numeric'}
      pattern={decimal ? '[0-9]+([.,][0-9]+)?' : '[0-9]+'}
      defaultValue={value?.toLocaleString('it-IT', { useGrouping: false })}
      className={field}
    />
  </Field>
)
const Txt = ({ name, label, value, placeholder }: { name: string; label: string; value?: string; placeholder?: string }) => (
  <Field label={label}>
    <input id={name} name={name} defaultValue={value} placeholder={placeholder} className={field} />
  </Field>
)

export const BikeForm = ({ bike, onDone, onCancel }: { bike?: Bike; onDone: (b: Bike) => void; onCancel?: () => void }) => {
  const [error, setError] = useState('')
  const [photo, setPhoto] = useState<Blob>()
  const saved = usePhoto(bike?.photoId)
  const [preview, setPreview] = useState<string>()

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      const draft = bikeFromForm(new FormData(e.currentTarget), bike)
      const photoId = photo ? (await save('attachments', { name: 'moto.jpg', type: 'image/jpeg', blob: photo })).id : bike?.photoId
      onDone(await save('bikes', { ...draft, id: bike?.id, photoId }))
    } catch (err) {
      setError(err instanceof RangeError ? err.message : 'Salvataggio non riuscito')
    }
  }

  // La foto passa dall'editor (zoom e spostamento) e ne esce già ritagliata 16:9 a 1600 px
  const [editing, setEditing] = useState<File>()
  const edited = (blob: Blob) => {
    setPhoto(blob)
    setPreview(URL.createObjectURL(blob))
    setEditing(undefined)
  }

  // Marca → modello → anno a cascata; scelto il modello, i dati tecnici del catalogo riempiono la scheda
  const [make, setMake] = useState(bike?.make ?? '')
  const [model, setModel] = useState(bike?.model ?? '')
  const [prefill, setPrefill] = useState<Spec>()
  const [rev, setRev] = useState(0)
  const applySpecs = (mk: string, md: string, yr?: string) => {
    const s = specsOf(mk, md, yr ? Number(yr) : undefined)
    if (!s) return
    setPrefill(s)
    setRev((r) => r + 1)
  }
  const opts = (xs: (string | number)[]) => xs.map((x) => ({ label: String(x) }))

  const t = bike?.tyres
  const fl = bike?.fluids
  const sp = bike?.specs
  const p = prefill
  return (
    <Screen>
      {editing && <PhotoEditor file={editing} onDone={edited} onCancel={() => setEditing(undefined)} />}
      <header className="flex items-center justify-between">
        <h1 className="font-gauge text-2xl">{bike ? 'Scheda moto' : 'Aggiungi moto'}</h1>
        {onCancel && <button type="button" onClick={onCancel} className={ghost}>Annulla</button>}
      </header>
      <form onSubmit={submit} className="grid gap-4">
        <label className="grid aspect-[16/9] max-w-full cursor-pointer place-items-center overflow-hidden rounded-panel border border-dashed border-edge bg-well text-sm text-dim">
          {preview ?? saved ? <img src={preview ?? saved} alt="Foto della moto" className="h-full w-full object-cover" /> : 'Aggiungi una foto'}
          <input id="photo" type="file" accept="image/*" className="sr-only" onChange={(e) => {
            setEditing(e.target.files?.[0])
            e.target.value = ''
          }} />
        </label>
        <Group title="Dati base" open>
          <Field label="Marca">
            <Combobox id="make" name="make" required options={opts(brands())} defaultValue={bike?.make} placeholder="es. Kawasaki"
              onPick={(v) => { if (v !== make) { setMake(v); setModel('') } }} />
          </Field>
          <Field label="Modello">
            <Combobox key={`model-${make}`} id="model" name="model" required options={modelsOf(make)} defaultValue={model}
              disabled={!make} placeholder={make ? 'Modello' : 'Scegli prima la marca'}
              onPick={(v) => { setModel(v); applySpecs(make, v) }} />
          </Field>
          <Field label="Anno">
            <Combobox key={`year-${make}-${model}`} id="year" name="year" required options={opts(yearsOf(make, model))}
              defaultValue={bike && bike.make === make && bike.model === model ? String(bike.year) : ''}
              disabled={!model} placeholder={model ? 'Anno' : 'Scegli prima il modello'}
              onPick={(v) => applySpecs(make, model, v)} />
          </Field>
          <Num name="startKm" label={bike ? 'Km iniziali' : 'Km attuali'} value={bike?.startKm} />
          <Field label="Tipo di moto">
            <select id="category" name="category" defaultValue={bike?.category ?? 'naked'} className={field}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          <Txt name="plate" label="Targa" value={bike?.plate} />
          <Txt name="vin" label="Telaio" value={bike?.vin} />
        </Group>
        <Group key={`tyres-${rev}`} title="Gomme e pressioni" open={!!(t || p?.tyreFront)}>
          <Field label="Misura ant.">
            <Combobox id="tyreFront" name="tyreFront" options={opts(TYRES)} defaultValue={p?.tyreFront ?? t?.front} placeholder="120/70 ZR17" />
          </Field>
          <Field label="Misura post.">
            <Combobox id="tyreRear" name="tyreRear" options={opts(TYRES)} defaultValue={p?.tyreRear ?? t?.rear} placeholder="160/60 ZR17" />
          </Field>
          <Num name="psFront" label="Bar ant. da solo" value={t?.pressureSolo?.front} decimal />
          <Num name="psRear" label="Bar post. da solo" value={t?.pressureSolo?.rear} decimal />
          <Num name="pdFront" label="Bar ant. in due" value={t?.pressureDuo?.front} decimal />
          <Num name="pdRear" label="Bar post. in due" value={t?.pressureDuo?.rear} decimal />
        </Group>
        <Group key={`fluids-${rev}`} title="Liquidi" open={!!(fl || p?.oilGrade)}>
          <Field label="Olio">
            <Combobox id="oilType" name="oilType" options={opts(OIL_TYPES)} defaultValue={fl?.oilType} placeholder="Sintetico" />
          </Field>
          <Field label="Gradazione">
            <Combobox id="oilGrade" name="oilGrade" options={opts(OIL_GRADES)} defaultValue={p?.oilGrade ?? fl?.oilGrade} placeholder="10W-40" />
          </Field>
          <Num name="oilLitres" label="Litri olio" value={p?.oilLitres ?? fl?.oilLitres} decimal />
          <Field label="Liquido freni">
            <Combobox id="brakeFluid" name="brakeFluid" options={opts(BRAKE_FLUIDS)} defaultValue={p?.brakeFluid ?? fl?.brakeFluid} placeholder="DOT 4" />
          </Field>
          <Txt name="sparkPlug" label="Candele" value={fl?.sparkPlug} />
        </Group>
        <Group key={`specs-${rev}`} title="Dati tecnici" open={!!(sp || p)}>
          {p && <p className="col-span-2 m-0 text-xs text-dim">Compilati dalla scheda ufficiale: puoi modificarli.</p>}
          <Num name="cc" label="Cilindrata (cc)" value={p?.cc ?? sp?.cc} />
          <Num name="hp" label="Potenza (CV)" value={p?.hp ?? sp?.hp} />
          <Num name="kg" label="Peso (kg)" value={p?.kg ?? sp?.kg} />
          <Num name="tankLitres" label="Serbatoio (l)" value={p?.tankLitres ?? sp?.tankLitres} decimal />
          <Num name="consumption" label="Consumo (km/l)" value={sp?.consumption} decimal />
        </Group>
        {error && <p role="alert" className="text-sm text-red">{error}</p>}
        <button className={primary}>Salva moto</button>
      </form>
    </Screen>
  )
}
