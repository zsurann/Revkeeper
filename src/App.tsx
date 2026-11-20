import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { BikeForm } from './BikeForm'
import { DueList, NextServiceCard, ServiceArc, type Row } from './Dashboard'
import { Documents } from './Documents'
import { Services } from './Services'
import { addReading, KmDecreasingError, listBikes, listByBike, save } from './db'
import { currentKm, documentStatus, nextDue } from './domain/due'
import { itemsFor } from './domain/intervals'
import { DEFAULT_THRESHOLDS, type Bike, type BikeDocument, type Id, type MaintenanceItem, type OdometerReading, type Service, type Status } from './domain/types'
import { Garage } from './Garage'
import { Maintenance } from './Maintenance'
import { Odometer } from './Odometer'
import { dueShort, monthYear } from './format'
import { Screen, field, ghost, primary } from './ui'

const today = () => new Date().toISOString().slice(0, 10)
const ACTIVE = 'revkeeper.activeBike'
const readActive = () => {
  try { return localStorage.getItem(ACTIVE) ?? undefined } catch { return undefined }
}
const writeActive = (id: Id) => {
  try { localStorage.setItem(ACTIVE, id) } catch { /* preferenza per dispositivo, non critica */ }
}
const RANK: Record<Status, number> = { overdue: 0, warn: 1, ok: 2 }
const DOC_LABEL = { assicurazione: 'Assicurazione', bollo: 'Bollo', revisione: 'Revisione' } as const

type View = 'home' | 'garage' | 'new' | 'edit' | 'maintenance'
type Tab = 'dash' | 'services' | 'documents'
const TABS: { id: Tab; label: string }[] = [
  { id: 'dash', label: 'Cruscotto' },
  { id: 'services', label: 'Interventi' },
  { id: 'documents', label: 'Documenti' },
]
type Detail = { items: MaintenanceItem[]; services: Service[]; readings: OdometerReading[]; documents: BikeDocument[] }

export const App = () => {
  const [bikes, setBikes] = useState<Bike[]>()
  const [kms, setKms] = useState<Record<Id, number>>({})
  const [activeId, setActiveId] = useState(readActive)
  const [view, setView] = useState<View>('home')
  const [tab, setTab] = useState<Tab>('dash')
  const [prevKm, setPrevKm] = useState<number>()
  const [detail, setDetail] = useState<Detail>()
  const [error, setError] = useState('')

  const bike = bikes?.find((b) => b.id === activeId) ?? bikes?.[0]
  const km = bike ? (kms[bike.id] ?? bike.startKm) : 0

  const load = useCallback(async () => {
    const all = await listBikes()
    const entries = await Promise.all(all.map(async (b) => [b.id, currentKm(b, await listByBike('readings', b.id))] as const))
    setKms(Object.fromEntries(entries))
    setBikes(all)
  }, [])
  useEffect(() => void load(), [load])

  const loadDetail = useCallback(async (b: Bike) => {
    const [items, services, readings, documents] = await Promise.all([
      listByBike('items', b.id),
      listByBike('services', b.id),
      listByBike('readings', b.id),
      listByBike('documents', b.id),
    ])
    setDetail({ items, services, readings, documents })
  }, [])
  useEffect(() => {
    if (bike) void loadDetail(bike)
  }, [bike, kms, loadDetail])

  const rows = useMemo(() => {
    if (!bike || !detail) return []
    const d = today()
    const items: Row[] = detail.items.map((i) => {
      const due = nextDue(i, bike, detail.services, detail.readings, d, DEFAULT_THRESHOLDS)
      return { id: i.id, label: i.label, status: due.status, due, right: dueShort(due) }
    })
    const docs: Row[] = detail.documents.map((doc) => ({
      id: doc.id,
      label: DOC_LABEL[doc.kind],
      status: documentStatus(doc, d, DEFAULT_THRESHOLDS),
      right: monthYear(doc.dueDate),
    }))
    return [...items, ...docs].sort((a, b) => RANK[a.status] - RANK[b.status] || (b.due?.progress ?? 0) - (a.due?.progress ?? 0))
  }, [bike, detail])

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

  // Una moto senza voci riceve quelle del modello verificato o del preset della sua categoria
  const saved = async (b: Bike) => {
    if ((await listByBike('items', b.id)).length === 0) await Promise.all(itemsFor(b).map((i) => save('items', i)))
    await load()
    pick(b.id)
  }

  if (!bikes) return null
  if (!bike || view === 'new') return <BikeForm onDone={saved} onCancel={bike ? () => setView('garage') : undefined} />
  if (view === 'edit') return <BikeForm bike={bike} onDone={saved} onCancel={() => setView('home')} />
  if (view === 'garage')
    return <Garage bikes={bikes} kms={kms} activeId={bike.id} onPick={pick} onAdd={() => setView('new')} onClose={() => setView('home')} />
  if (view === 'maintenance' && detail)
    return <Maintenance bike={bike} items={detail.items} onChange={() => void loadDetail(bike)} onClose={() => setView('home')} />

  // La scheda grande mostra la manutenzione più urgente; i documenti restano nell'elenco
  const next = rows.find((r) => r.due)
  const rest = rows.filter((r) => r !== next)
  const refresh = () => void load().then(() => loadDetail(bike))
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
      {tab === 'dash' && (
        <>
          <div>
            {next?.due && <ServiceArc key={`arc-${bike.id}-${km}`} progress={next.due.progress} label={next.label} />}
            <Odometer key={`${bike.id}-${km}`} value={km} from={prevKm ?? km - 120} />
          </div>
          {next?.due && <NextServiceCard label={next.label} due={next.due} />}
          {rest.length > 0 && <DueList rows={rest} />}
          <button onClick={() => setView('maintenance')} className={`justify-self-start ${ghost}`}>Modifica intervalli</button>
          <form onSubmit={updateKm} className="grid gap-2 rounded-panel bg-panel p-4">
            <label htmlFor="km" className="text-sm text-dim">Km letti sul cruscotto</label>
            <div className="flex gap-2">
              <input id="km" name="km" required inputMode="numeric" pattern="[0-9]*" className={field} />
              <button className={`shrink-0 ${primary}`}>+ Aggiorna km</button>
            </div>
            {error && <p role="alert" className="text-sm text-red">{error}</p>}
          </form>
        </>
      )}
      {tab === 'services' && detail && <Services bike={bike} km={km} items={detail.items} services={detail.services} onChange={refresh} />}
      {tab === 'documents' && detail && <Documents bike={bike} documents={detail.documents} onChange={refresh} />}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-rule bg-dash/95 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined} className={`px-3 py-1 font-gauge text-sm ${tab === t.id ? 'text-amber' : 'text-dim'}`}>
            {t.label}
          </button>
        ))}
      </nav>
    </Screen>
  )
}
