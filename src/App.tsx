import { AnimatePresence, LayoutGroup, LazyMotion, m, MotionConfig } from 'motion/react'
import { ChevronDown, FileText, Gauge, NotebookPen, Settings2, UserRound, Warehouse, WifiOff, Wrench, type LucideIcon } from 'lucide-react'
import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Dashboard, DashboardSkeleton, type DocRow, type Row } from './Dashboard'
import { startAutoSync } from './sync'
import { findDuplicateBikes, getMeta, listBikes, listByBike, mergeBikes, save } from './db'
import { currentKm, daysBetween, documentStatus, kmPerDay, nextDue } from './domain/due'
import { DEFAULT_THRESHOLDS, type Bike, type BikeDocument, type Id, type MaintenanceItem, type OdometerReading, type Service, type Status } from './domain/types'
import { Garage } from './Garage'
import { KmSheet } from './KmSheet'
import { Mark } from './Mark'
import { Splash } from './Splash'
import { Welcome } from './Welcome'
import { eur, today } from './format'
import { watchSystemTheme } from './theme'
import { toast, Toaster } from './toast'
import { EdgeSwipeBack, supportsEdgeSwipeBack } from './EdgeSwipeBack'
import { useBackDepth } from './historyLayers'
import { UpdatePrompt } from './UpdatePrompt'
import { btn, usePhoto } from './ui'

// Schermate che non servono all'avvio: si scaricano a parte (restano nel precache, quindi vanno anche offline).
// Il cruscotto e il benvenuto restano nel pacchetto principale.
const Account = lazy(() => import('./Account').then((m) => ({ default: m.Account })))
const BikeForm = lazy(() => import('./BikeForm').then((m) => ({ default: m.BikeForm })))
const Documents = lazy(() => import('./Documents').then((m) => ({ default: m.Documents })))
const Maintenance = lazy(() => import('./Maintenance').then((m) => ({ default: m.Maintenance })))
const Services = lazy(() => import('./Services').then((m) => ({ default: m.Services })))

const ACTIVE = 'revkeeper.activeBike'
const readActive = () => {
  try { return localStorage.getItem(ACTIVE) ?? undefined } catch { return undefined }
}
const writeActive = (id: Id) => {
  try { localStorage.setItem(ACTIVE, id) } catch { /* preferenza per dispositivo, non critica */ }
}
const clearActive = () => {
  try { localStorage.removeItem(ACTIVE) } catch { /* ignore */ }
}
const WELCOMED = 'revkeeper.welcomed'
const readWelcomed = () => {
  try { return localStorage.getItem(WELCOMED) === '1' } catch { return false }
}
const writeWelcomed = () => {
  try { localStorage.setItem(WELCOMED, '1') } catch { /* al prossimo avvio senza moto si rivede il benvenuto */ }
}
const RANK: Record<Status, number> = { overdue: 0, warn: 1, ok: 2 }

type View = 'home' | 'garage' | 'new' | 'edit' | 'account'
type Tab = 'dash' | 'maint' | 'services' | 'documents'
type Nav = { view: View; tab: Tab }
const ROOT: Nav = { view: 'home', tab: 'dash' }
const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'dash', label: 'Cruscotto', icon: Gauge },
  { id: 'maint', label: 'Manutenzione', icon: Wrench },
  { id: 'services', label: 'Interventi', icon: NotebookPen },
  { id: 'documents', label: 'Documenti', icon: FileText },
]
type Detail = { items: MaintenanceItem[]; services: Service[]; readings: OdometerReading[]; documents: BikeDocument[] }

const useOnline = () => {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => { setOnline(true); toast('Di nuovo online', { kind: 'info', body: 'Sincronizzo le modifiche' }) }
    const off = () => setOnline(false)
    addEventListener('online', on)
    addEventListener('offline', off)
    return () => { removeEventListener('online', on); removeEventListener('offline', off) }
  }, [])
  return online
}

// Un errore imprevisto non lascia lo schermo bianco: messaggio e pulsante per ripartire
class Boundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {}
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className="mx-auto grid min-h-dvh max-w-[420px] content-center justify-items-center gap-4 px-6 text-center">
        <Mark size={72} />
        <h1 className="t-display m-0 text-[28px]">Qualcosa si è inceppato</h1>
        <p className="m-0 text-[15px] text-ink-2">I tuoi dati sono al sicuro sul telefono. Riapri l'app per ripartire.</p>
        <button type="button" onClick={() => location.reload()} className={btn.primary}>Ricarica</button>
        <p className="m-0 text-[12px] text-ink-3">{this.state.error.message}</p>
      </main>
    )
  }
}

const initials = (email?: string) => (email ? email.split('@')[0]!.split(/[._-]/).filter(Boolean).slice(0, 2).map((s) => s[0]!.toUpperCase()).join('') : '')
const Avatar = ({ email, size = 40 }: { email?: string; size?: number }) => (
  <span className="t-title grid place-items-center rounded-full bg-[#0E1116] text-[13px] text-[#D4FF3A] dark:ring-1 dark:ring-line-strong" style={{ width: size, height: size }}>
    {email ? initials(email) : <UserRound size={18} />}
  </span>
)
const BikeThumb = ({ bike, className }: { bike: Bike; className: string }) => {
  const photo = usePhoto(bike.photoId)
  return photo
    ? <img src={photo} alt="" className={`${className} object-cover`} />
    : <span className={`${className} t-title grid place-items-center bg-[#0E1116] text-[12px] text-[#D4FF3A]`}>{bike.make.slice(0, 2).toUpperCase()}</span>
}

// Solo i componenti "m" leggeri nel blocco iniziale; le funzioni di Motion arrivano in un file a parte
const motionFeatures = () => import('./motionFeatures').then((x) => x.default)

export const App = () => (
  <LazyMotion features={motionFeatures} strict>
    <MotionConfig reducedMotion="user">
      <Boundary>
        <Main />
        <Toaster />
        <UpdatePrompt />
        <Splash />
      </Boundary>
    </MotionConfig>
  </LazyMotion>
)

const toTop = () => {
  scrollTo({ top: 0, behavior: 'instant' })
}

const Main = () => {
  const [bikes, setBikes] = useState<Bike[]>()
  const [kms, setKms] = useState<Record<Id, number>>({})
  const [activeId, setActiveId] = useState(readActive)
  const [stack, setStack] = useState<Nav[]>([ROOT])
  const { view, tab } = stack[stack.length - 1]!
  const [prevKm, setPrevKm] = useState<number>()
  const [detail, setDetail] = useState<Detail>()
  const [welcomed, setWelcomed] = useState(readWelcomed)
  const [kmOpen, setKmOpen] = useState(false)
  const [email, setEmail] = useState<string>()
  const online = useOnline()

  const bike = bikes?.find((b) => b.id === activeId) ?? bikes?.[0]
  const edgeSwipe = supportsEdgeSwipeBack()
  const km = bike ? (kms[bike.id] ?? bike.startKm) : 0

  const load = useCallback(async () => {
    const all = await listBikes()
    const entries = await Promise.all(all.map(async (b) => [b.id, currentKm(b, await listByBike('readings', b.id))] as const))
    setKms(Object.fromEntries(entries))
    setBikes(all)
    setEmail(await getMeta<string>('account'))
  }, [])
  useEffect(() => void load(), [load])
  useEffect(() => watchSystemTheme(), [])
  // Ogni cambio di schermata riparte dall'alto (es. dopo aver salvato il modulo moto)
  useEffect(toTop, [view, tab, bike?.id])
  useEffect(() => {
    startAutoSync()
    const onSynced = () => void load()
    const onLoggedOut = () => {
      setWelcomed(false)
      setActiveId(undefined)
      setDetail(undefined)
      setEmail(undefined)
      setStack([ROOT])
      void load()
    }
    addEventListener('revkeeper:synced', onSynced)
    addEventListener('revkeeper:loggedout', onLoggedOut)
    return () => {
      removeEventListener('revkeeper:synced', onSynced)
      removeEventListener('revkeeper:loggedout', onLoggedOut)
    }
  }, [load])

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
      return { id: i.id, item: i, status: due.status, due }
    })
    const left = (r: Row) => r.due.kmLeft ?? Infinity
    return items.sort((a, b) => RANK[a.status] - RANK[b.status] || b.due.progress - a.due.progress || left(a) - left(b))
  }, [bike, detail])
  const docs = useMemo<DocRow[]>(() => {
    const d = today()
    return (detail?.documents ?? []).map((doc) => ({ kind: doc.kind, doc, status: documentStatus(doc, d, DEFAULT_THRESHOLDS), days: daysBetween(d, doc.dueDate) }))
  }, [detail])

  const openView = useCallback((v: Exclude<View, 'home'>) => {
    setStack((s) => {
      const cur = s[s.length - 1]!
      if (v === 'new' || v === 'edit') return [...s, { view: v, tab: cur.tab }]
      const base = s.filter((e) => e.view === 'home')
      return [...(base.length ? base : [ROOT]), { view: v, tab: cur.tab }]
    })
  }, [])
  const goBack = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), [])
  useBackDepth(bikes?.length || view !== 'home' ? stack.length - 1 : 0, goBack)

  const pick = (id: Id) => {
    writeActive(id)
    setActiveId(id)
    setPrevKm(undefined)
    setStack((s) => {
      const base = s.filter((e) => e.view === 'home')
      return base.length ? base : [ROOT]
    })
  }
  const go = useCallback((t: Tab) => {
    setStack(t === 'dash' ? [ROOT] : [ROOT, { view: 'home', tab: t }])
  }, [])

  // Una moto senza voci riceve quelle del modello verificato o del preset della sua categoria
  const saved = async (b: Bike) => {
    if ((await listByBike('items', b.id)).length === 0) {
      const { itemsFor } = await import('./domain/intervals')
      await Promise.all(itemsFor(b).map((i) => save('items', i)))
    }
    await load()
    pick(b.id)
    toast('Moto salvata', { body: `${b.make} ${b.model}` })
  }
  const deleted = async (id: Id) => {
    const remaining = await listBikes()
    if (id === bike?.id) {
      const nextBike = remaining[0]
      if (nextBike) {
        writeActive(nextBike.id)
        setActiveId(nextBike.id)
      } else {
        clearActive()
        setActiveId(undefined)
      }
      setPrevKm(undefined)
      setDetail(undefined)
    }
    await load()
  }

  if (!bikes)
    return <div className="mx-auto max-w-[480px] px-4 pt-[max(76px,env(safe-area-inset-top))]"><DashboardSkeleton /></div>
  // Primo avvio senza moto: benvenuto (accesso, promemoria), poi la scheda della prima moto
  if (!welcomed && bikes.length === 0)
    return (
      <Welcome
        onDone={() => {
          writeWelcomed()
          setWelcomed(true)
          void load()
        }}
      />
    )
  const loading = <div className="mx-auto max-w-[480px] px-4 pt-[max(76px,env(safe-area-inset-top))]"><DashboardSkeleton /></div>
  if (!bike && view === 'garage') return (
    <EdgeSwipeBack enabled={stack.length > 1 && edgeSwipe} onBack={goBack}>
      <Garage bikes={[]} kms={kms} activeId={undefined} onPick={pick} onEdit={() => {}} onDeleted={deleted} onAdd={() => openView('new')} onClose={goBack} onAccount={() => openView('account')} />
    </EdgeSwipeBack>
  )
  if (!bike && view === 'account') return (
    <EdgeSwipeBack enabled={stack.length > 1 && edgeSwipe} onBack={goBack}>
      <Suspense fallback={loading}><Account onClose={goBack} onAccount={setEmail} /></Suspense>
    </EdgeSwipeBack>
  )
  if (!bike || view === 'new') return (
    <EdgeSwipeBack enabled={stack.length > 1 && edgeSwipe} onBack={goBack}>
      <Suspense fallback={loading}><BikeForm onDone={saved} onCancel={bike || stack.length > 1 ? goBack : undefined} /></Suspense>
    </EdgeSwipeBack>
  )
  if (view === 'edit') return (
    <EdgeSwipeBack enabled={stack.length > 1 && edgeSwipe} onBack={goBack}>
      <Suspense fallback={loading}><BikeForm bike={bike} onDone={saved} onCancel={goBack} /></Suspense>
    </EdgeSwipeBack>
  )

  const next = rows[0]
  const rest = rows.slice(1, 6)
  const refresh = () => void load().then(() => loadDetail(bike))
  const dup = findDuplicateBikes(bikes)
  const labelOf = (id: string) => detail?.items.find((i) => i.id === id)?.label ?? 'Voce rimossa'
  const year = today().slice(0, 4)
  const spentYear = (detail?.services ?? []).filter((s) => s.date.startsWith(year)).reduce((a, s) => a + (s.costTotal ?? 0), 0)
  const last = [...(detail?.services ?? [])].sort((a, b) => b.date.localeCompare(a.date) || b.km - a.km)[0]
  const garageLabel = bikes.length === 1 ? '1 moto nel garage' : `${bikes.length} moto nel garage`
  const inTabs = view === 'home'

  const content = (() => {
    if (view === 'account') return <Account onClose={goBack} onAccount={setEmail} />
    if (view === 'garage')
      return <Garage bikes={bikes} kms={kms} activeId={bike.id} onPick={pick} onEdit={(id) => { writeActive(id); setActiveId(id); openView('edit') }} onDeleted={deleted} onAdd={() => openView('new')} onClose={goBack} onAccount={() => openView('account')} />
    if (!detail) return <DashboardSkeleton />
    if (tab === 'maint') return <Maintenance bike={bike} items={detail.items} rows={rows} onChange={() => void loadDetail(bike)} />
    if (tab === 'services') return <Services bike={bike} km={km} items={detail.items} services={detail.services} readings={detail.readings} onChange={refresh} />
    if (tab === 'documents') return <Documents bike={bike} documents={detail.documents} onChange={refresh} />
    return <Dashboard next={next} rows={rest} docs={docs} last={last} labelOf={labelOf} km={km} from={prevKm ?? Math.max(0, km - 120)} rate={detail ? kmPerDay(detail.readings, today()) : undefined} onKm={() => setKmOpen(true)} go={go} />
  })()
  const pageKey = inTabs ? tab : view

  return (
    <LayoutGroup>
      <div className="lg:grid lg:min-h-dvh lg:grid-cols-[264px_1fr]">
        {/* Barra laterale sui computer */}
        <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-line bg-surface px-4 py-6 lg:flex">
          <div className="flex items-center gap-2.5 px-2"><Mark size={34} /><span className="t-display text-[20px]">revkeeper</span></div>
          <button type="button" onClick={() => openView('garage')} className="flex items-center gap-3 rounded-lg bg-sunken p-2 text-left ring-1 ring-line hover:ring-line-strong">
            <BikeThumb bike={bike} className="size-11 shrink-0 rounded-[10px]" />
            <span className="grid min-w-0 flex-1"><b className="truncate text-[14px] font-semibold">{bike.make} {bike.model}</b><span className="truncate text-[12px] text-ink-3">{[bike.plate, bike.year].filter(Boolean).join(' · ')}</span></span>
            <ChevronDown size={16} className="text-ink-3" />
          </button>
          <nav className="grid gap-1" aria-label="Sezioni">
            {[...TABS, { id: 'garage' as const, label: 'Garage', icon: Warehouse }, { id: 'account' as const, label: 'Account', icon: Settings2 }].map((t) => {
              const on = t.id === 'garage' || t.id === 'account' ? view === t.id : inTabs && tab === t.id
              return (
                <button key={t.id} type="button" onClick={() => (t.id === 'garage' || t.id === 'account' ? openView(t.id) : go(t.id))} aria-current={on ? 'page' : undefined}
                  className={`relative flex h-11 items-center gap-3 rounded-full px-4 text-[14px] font-semibold transition-colors ${on ? 'text-black' : 'text-ink-2 hover:bg-sunken'}`}>
                  {on && <m.span layoutId="side-pill" className="absolute inset-0 rounded-full bg-lime" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                  <t.icon size={19} className="relative" /><span className="relative">{t.label}</span>
                </button>
              )
            })}
          </nav>
          {spentYear > 0 && (
            <div className="mt-auto grid gap-1 rounded-lg bg-display p-4 text-display-ink">
              <span className="t-label text-display-dim">Speso nel {year}</span>
              <b className="t-num text-[28px]">{eur(spentYear)}</b>
            </div>
          )}
        </aside>

        <div className="min-w-0">
          {!online && (
            <div role="status" className="sticky top-0 z-30 flex items-center justify-center gap-2 bg-ink px-4 pb-2 pt-[max(8px,env(safe-area-inset-top))] text-[13px] font-medium text-bg">
              <WifiOff size={15} />Sei offline · le modifiche restano sul telefono
            </div>
          )}
          {inTabs && (
            <header className={`sticky z-20 mx-auto flex max-w-[480px] items-center justify-between gap-3 bg-bg/85 px-4 pb-3 backdrop-blur-md lg:hidden ${online ? 'top-0 pt-[max(14px,env(safe-area-inset-top))]' : 'top-[calc(32px+env(safe-area-inset-top))] pt-3'}`}>
              <button type="button" onClick={() => openView('garage')} className="flex min-w-0 items-center gap-2.5 rounded-full py-1 pl-1 pr-3 hover:bg-sunken" aria-label={`${bike.make} ${bike.model}, apri il garage`}>
                <BikeThumb bike={bike} className="size-9 shrink-0 rounded-full ring-2 ring-surface" />
                <span className="grid min-w-0 text-left leading-tight"><b className="t-title truncate text-[16px]">{bike.make} {bike.model}</b><span className="text-[12px] text-ink-3">{garageLabel}</span></span>
                <ChevronDown size={16} className="shrink-0 text-ink-3" />
              </button>
              <button type="button" onClick={() => openView('account')} aria-label="Account e impostazioni"><Avatar email={email} /></button>
            </header>
          )}
          {dup && inTabs && (
            <div role="alert" className="mx-auto mb-2 grid max-w-[480px] gap-2 px-4 lg:max-w-[760px] lg:px-8 lg:pt-6">
              <div className="grid gap-2 rounded-lg bg-amber-soft p-4 text-[14px] text-ink ring-1 ring-amber/40">
                <span>Sembrano la stessa moto: <b className="font-semibold">{dup[0].make} {dup[0].model} {dup[0].plate}</b>. Unisco i dati in una sola?</span>
                <button type="button" onClick={() => void mergeBikes(dup[0].id, dup[1].id).then(load).then(() => toast('Moto unite'))} className={`${btn.secondary} justify-self-start`}>Unisci</button>
              </div>
            </div>
          )}
          <EdgeSwipeBack enabled={!inTabs && stack.length > 1 && edgeSwipe} onBack={goBack}>
          <AnimatePresence mode="wait" initial={false} onExitComplete={toTop}>
            <m.div key={pageKey} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
              <Suspense fallback={<div className="mx-auto max-w-[480px] px-4 pt-2"><DashboardSkeleton /></div>}>
                {inTabs ? (
                  <main className="mx-auto grid max-w-[480px] content-start gap-6 px-4 pb-32 pt-2 lg:max-w-[1100px] lg:px-10 lg:pb-16 lg:pt-8">{content}</main>
                ) : content}
              </Suspense>
            </m.div>
          </AnimatePresence>
          </EdgeSwipeBack>
        </div>
      </div>

      {inTabs && (
        <nav aria-label="Sezioni" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 pb-[max(10px,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl lg:hidden">
          <div className="mx-auto grid max-w-[480px] grid-cols-4">
            {TABS.map((t) => {
              const on = tab === t.id
              return (
                <button key={t.id} type="button" onClick={() => go(t.id)} aria-current={on ? 'page' : undefined} className={`grid min-h-12 justify-items-center gap-1 py-1 text-[11px] font-semibold transition-colors ${on ? 'text-ink' : 'text-ink-3'}`}>
                  <span className="relative grid h-8 w-14 place-items-center">
                    {on && <m.span layoutId="tab-pill" className="absolute inset-0 rounded-full bg-lime" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                    <t.icon size={20} strokeWidth={on ? 2.3 : 1.9} className={`relative ${on ? 'text-black' : ''}`} />
                  </span>
                  {t.label}
                </button>
              )
            })}
          </div>
        </nav>
      )}
      <KmSheet open={kmOpen} bike={bike} km={km} onClose={() => setKmOpen(false)} onSaved={async (prev) => { setPrevKm(prev); await load() }} onChange={async () => { setPrevKm(undefined); await load() }} />
    </LayoutGroup>
  )
}
