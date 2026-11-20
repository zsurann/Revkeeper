import { useState, type FormEvent, type ReactNode } from 'react'
import { save } from './db'
import { BRANDS, bikeFromForm } from './domain/bikeForm'
import type { Bike } from './domain/types'
import { compressImage } from './image'
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

  const pick = async (file?: File) => {
    if (!file) return
    try {
      const blob = await compressImage(file)
      setPhoto(blob)
      setPreview(URL.createObjectURL(blob))
    } catch {
      setError('Non riesco a leggere questa foto')
    }
  }

  const t = bike?.tyres
  const fl = bike?.fluids
  const sp = bike?.specs
  return (
    <Screen>
      <header className="flex items-center justify-between">
        <h1 className="font-gauge text-2xl">{bike ? 'Scheda moto' : 'Aggiungi moto'}</h1>
        {onCancel && <button type="button" onClick={onCancel} className={ghost}>Annulla</button>}
      </header>
      <form onSubmit={submit} className="grid gap-4">
        <label className="grid aspect-[16/9] max-w-full cursor-pointer place-items-center overflow-hidden rounded-panel border border-dashed border-edge bg-well text-sm text-dim">
          {preview ?? saved ? <img src={preview ?? saved} alt="Foto della moto" className="h-full w-full object-cover" /> : 'Aggiungi una foto'}
          <input id="photo" type="file" accept="image/*" className="sr-only" onChange={(e) => void pick(e.target.files?.[0])} />
        </label>
        <Group title="Dati base" open>
          <Field label="Marca">
            <input id="make" name="make" list="brands" required defaultValue={bike?.make} className={field} />
            <datalist id="brands">{BRANDS.map((b) => <option key={b} value={b} />)}</datalist>
          </Field>
          <Txt name="model" label="Modello" value={bike?.model} placeholder="Africa Twin" />
          <Num name="year" label="Anno" value={bike?.year} />
          <Num name="startKm" label={bike ? 'Km iniziali' : 'Km attuali'} value={bike?.startKm} />
          <Txt name="plate" label="Targa" value={bike?.plate} />
          <Txt name="vin" label="Telaio" value={bike?.vin} />
        </Group>
        <Group title="Gomme e pressioni" open={!!t}>
          <Txt name="tyreFront" label="Misura ant." value={t?.front} placeholder="90/90-21" />
          <Txt name="tyreRear" label="Misura post." value={t?.rear} placeholder="150/70-18" />
          <Num name="psFront" label="Bar ant. da solo" value={t?.pressureSolo?.front} decimal />
          <Num name="psRear" label="Bar post. da solo" value={t?.pressureSolo?.rear} decimal />
          <Num name="pdFront" label="Bar ant. in due" value={t?.pressureDuo?.front} decimal />
          <Num name="pdRear" label="Bar post. in due" value={t?.pressureDuo?.rear} decimal />
        </Group>
        <Group title="Liquidi" open={!!fl}>
          <Txt name="oilType" label="Olio" value={fl?.oilType} placeholder="Sintetico" />
          <Txt name="oilGrade" label="Gradazione" value={fl?.oilGrade} placeholder="10W-30" />
          <Num name="oilLitres" label="Litri olio" value={fl?.oilLitres} decimal />
          <Txt name="brakeFluid" label="Liquido freni" value={fl?.brakeFluid} placeholder="DOT 4" />
          <Txt name="sparkPlug" label="Candele" value={fl?.sparkPlug} />
        </Group>
        <Group title="Dati tecnici" open={!!sp}>
          <Num name="cc" label="Cilindrata (cc)" value={sp?.cc} />
          <Num name="hp" label="Potenza (CV)" value={sp?.hp} />
          <Num name="kg" label="Peso (kg)" value={sp?.kg} />
          <Num name="tankLitres" label="Serbatoio (l)" value={sp?.tankLitres} decimal />
          <Num name="consumption" label="Consumo (km/l)" value={sp?.consumption} decimal />
        </Group>
        {error && <p role="alert" className="text-sm text-red">{error}</p>}
        <button className={primary}>Salva moto</button>
      </form>
    </Screen>
  )
}
