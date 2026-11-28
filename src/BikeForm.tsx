import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { save } from './db'
import { Combobox } from './Combobox'
import { bikeFromForm } from './domain/bikeForm'
import { brands, loadBrand, modelsOf, specsOf, yearsOf } from './domain/catalog'
import type { Spec } from './domain/catalogBuild'
import { BRAKE_FLUIDS, OIL_GRADES, OIL_TYPES, TYRES } from './domain/parts'
import type { Bike } from './domain/types'
import { CATEGORIES } from './domain/intervals'
import { PhotoEditor } from './PhotoEditor'
import { Camera, Check, ChevronDown } from 'lucide-react'
import { ErrorText, Field, PageHead, Screen, btn, card, field, usePhoto } from './ui'

const Group = ({ title, children, open }: { title: string; children: ReactNode; open?: boolean }) => (
  <details open={open} className={`${card} group p-4`}>
    <summary className="-my-[9px] flex min-h-11 list-none items-center justify-between gap-3">
      <span className="t-title text-[17px]">{title}</span>
      <ChevronDown size={18} className="text-ink-3 transition-transform duration-[var(--duration-base)] group-open:rotate-180" />
    </summary>
    <div className="mt-4 grid grid-cols-2 gap-3">{children}</div>
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

const CC_BY_4 = 'https://creativecommons.org/licenses/by/4.0/'
const linkCls = 'underline decoration-ink-3 underline-offset-2 hover:text-ink'
const SpecSource = ({ source }: { source: string }) => {
  if (/^https?:\/\//.test(source)) {
    return (
      <p className="col-span-2 m-0 text-[12px] text-ink-3">
        Compilati da <a href={source} target="_blank" rel="noopener noreferrer" className={linkCls}>scheda ufficiale</a>. Puoi modificarli.
      </p>
    )
  }
  const text = source.replace('Registri ufficiali: ', 'registri ufficiali: ').replace(/\bASTRA\b/g, 'Ufficio federale delle strade (USTRA)')
  const parts = text.split('CC BY 4.0')
  return (
    <p className="col-span-2 m-0 text-[12px] text-ink-3">
      Compilati da {parts.length > 1 ? <>{parts[0]}<a href={CC_BY_4} target="_blank" rel="noopener noreferrer" className={linkCls}>CC BY 4.0</a>{parts.slice(1).join('CC BY 4.0')}</> : text}. Puoi modificarli.
    </p>
  )
}

export const BikeForm = ({ bike, onDone, onCancel }: { bike?: Bike; onDone: (b: Bike) => void; onCancel?: () => void }) => {
  const [error, setError] = useState('')
  const [photo, setPhoto] = useState<Blob>()
  const saved = usePhoto(bike?.photoId)
  const [preview, setPreview] = useState<string>()

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    try {
      const draft = bikeFromForm(form, bike)
      const photoId = photo ? (await save('attachments', { name: 'moto.jpg', type: 'image/jpeg', blob: photo })).id : bike?.photoId
      onDone(await save('bikes', { ...draft, id: bike?.id, photoId }))
    } catch (err) {
      setError(err instanceof RangeError ? err.message : 'Salvataggio non riuscito')
      // Porta al primo campo obbligatorio vuoto: l'errore è in fondo, il campo spesso è in cima
      const empty = ['make', 'model', 'year', 'startKm'].find((k) => !String(form.get(k) ?? '').trim())
      const el = empty ? document.getElementById(empty) : null
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      el?.setAttribute('aria-invalid', 'true')
      el?.addEventListener('input', () => el.removeAttribute('aria-invalid'), { once: true })
      el?.focus({ preventScroll: true })
    }
  }

  // La foto passa dall'editor (zoom e spostamento) e ne esce già ritagliata 4:3 a 1600 px
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
  // I modelli di una marca si scaricano alla scelta; `ready` ridisegna i menu quando arrivano
  const [ready, setReady] = useState('')
  useEffect(() => {
    let live = true
    // Offline e marca mai aperta: i menu restano vuoti finché torna la rete, nessun errore
    void loadBrand(make).then(() => live && setReady(make), () => undefined)
    return () => { live = false }
  }, [make])
  const applySpecs = (mk: string, md: string, yr?: string) => {
    const s = specsOf(mk, md, yr ? Number(yr) : undefined)
    if (!s && !prefill) return
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
      <PageHead title={bike ? 'Scheda moto' : 'Aggiungi moto'} sub={bike ? `${bike.make} ${bike.model}` : 'Marca, modello e anno bastano: il resto si compila dal catalogo.'} onBack={onCancel} />
      <form onSubmit={submit} className="grid gap-4">
        <label className="focus-within:ring-2 focus-within:ring-ink group relative grid aspect-[4/3] max-w-full cursor-pointer place-items-center overflow-hidden rounded-lg border border-dashed border-line-strong bg-sunken text-[14px] font-medium text-ink-2">
          {preview ?? saved ? (
            <>
              <img src={preview ?? saved} alt="Foto della moto" className="h-full w-full object-cover" />
              <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-[#0E1116]/80 px-3 py-1.5 text-[13px] text-white backdrop-blur"><Camera size={15} />Cambia foto</span>
            </>
          ) : (
            <span className="grid justify-items-center gap-2"><span className="grid size-12 place-items-center rounded-full bg-surface shadow-1"><Camera size={20} /></span>Aggiungi una foto</span>
          )}
          <input id="photo" type="file" accept="image/*" className="sr-only" onChange={(e) => {
            setEditing(e.target.files?.[0])
            e.target.value = ''
          }} />
        </label>
        <Group title="Dati base" open>
          <Field label="Marca">
            <Combobox id="make" name="make" required options={opts(brands())} defaultValue={bike?.make} placeholder="es. Kawasaki"
              onPick={(v) => { if (v !== make) { setMake(v); setModel(''); if (prefill) { setPrefill(undefined); setRev((r) => r + 1) } } }} />
          </Field>
          <Field label="Modello">
            <Combobox key={`model-${make}`} id="model" name="model" required options={modelsOf(make)} defaultValue={model}
              disabled={!make} placeholder={make ? 'Modello' : 'Prima la marca'}
              onPick={(v) => { setModel(v); applySpecs(make, v) }} />
          </Field>
          <Field label="Anno">
            <Combobox key={`year-${make}-${model}`} id="year" name="year" required options={opts(yearsOf(make, model))}
              defaultValue={bike && bike.make === make && bike.model === model ? String(bike.year) : ''}
              disabled={!model} placeholder={model ? 'Anno' : 'Prima il modello'}
              onPick={(v) => applySpecs(make, model, v)} />
          </Field>
          <Num name="startKm" label={bike ? 'Km iniziali' : 'Km attuali'} value={bike?.startKm} />
          {/* Riga intera e freccia disegnata: in mezza riga "Stradale / naked" veniva tagliato dalla freccia del sistema */}
          <Field label="Tipo di moto" className="col-span-2">
            <span className="relative block">
              <select id="category" name="category" defaultValue={bike?.category ?? 'naked'} className={`${field} appearance-none truncate pr-10`}>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <ChevronDown size={18} aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
            </span>
          </Field>
          <Txt name="plate" label="Targa" value={bike?.plate} />
          <Txt name="vin" label="Telaio" value={bike?.vin} />
        </Group>
        <Group key={`tyres-${rev}`} title="Gomme e pressioni" open={!!(t || p?.tyreFront)}>
          <Field label="Misura ant.">
            <Combobox id="tyreFront" name="tyreFront" options={opts(TYRES)} defaultValue={p?.tyreFront ?? t?.front} placeholder="es. 120/70 ZR17" />
          </Field>
          <Field label="Misura post.">
            <Combobox id="tyreRear" name="tyreRear" options={opts(TYRES)} defaultValue={p?.tyreRear ?? t?.rear} placeholder="es. 160/60 ZR17" />
          </Field>
          <Num name="psFront" label="Bar ant. da solo" value={t?.pressureSolo?.front} decimal />
          <Num name="psRear" label="Bar post. da solo" value={t?.pressureSolo?.rear} decimal />
          <Num name="pdFront" label="Bar ant. in due" value={t?.pressureDuo?.front} decimal />
          <Num name="pdRear" label="Bar post. in due" value={t?.pressureDuo?.rear} decimal />
        </Group>
        <Group key={`fluids-${rev}`} title="Liquidi" open={!!(fl || p?.oilGrade)}>
          <Field label="Olio">
            <Combobox id="oilType" name="oilType" options={opts(OIL_TYPES)} defaultValue={fl?.oilType} placeholder="es. Sintetico" />
          </Field>
          <Field label="Gradazione">
            <Combobox id="oilGrade" name="oilGrade" options={opts(OIL_GRADES)} defaultValue={p?.oilGrade ?? fl?.oilGrade} placeholder="es. 10W-40" />
          </Field>
          <Num name="oilLitres" label="Litri olio" value={p?.oilLitres ?? fl?.oilLitres} decimal />
          <Field label="Liquido freni">
            <Combobox id="brakeFluid" name="brakeFluid" options={opts(BRAKE_FLUIDS)} defaultValue={p?.brakeFluid ?? fl?.brakeFluid} placeholder="es. DOT 4" />
          </Field>
          <Txt name="sparkPlug" label="Candele" value={fl?.sparkPlug} />
        </Group>
        <Group key={`specs-${rev}`} title="Dati tecnici" open={!!(sp || p)}>
          {p && <SpecSource source={p.source} />}
          <Num name="cc" label="Cilindrata (cc)" value={p?.cc ?? sp?.cc} />
          <Num name="hp" label="Potenza (CV)" value={p?.hp ?? sp?.hp} />
          <Num name="kg" label="Peso (kg)" value={p?.kg ?? sp?.kg} />
          <Num name="tankLitres" label="Serbatoio (l)" value={p?.tankLitres ?? sp?.tankLitres} decimal />
          <Num name="consumption" label="Consumo (km/l)" value={sp?.consumption} decimal />
        </Group>
        {error && <ErrorText>{error}</ErrorText>}
        <button className={`${btn.primary} w-full`}><Check size={18} strokeWidth={2.6} />Salva moto</button>
      </form>
    </Screen>
  )
}
