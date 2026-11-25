import { m } from 'motion/react'
import { ChevronRight, FileText, Plus, Wrench } from 'lucide-react'
import { DisplayChip, Odometer, RevBar } from './Cluster'
import { daysBetween, type Due } from './domain/due'
import type { BikeDocument, DocKind, MaintenanceItem, Service, Status } from './domain/types'
import { dayMonth, daysText, dueRule, dueShort, eur, every, fullDate, int, km as fmtKm, monthYear, today } from './format'
import { DOC, DOC_KINDS, itemIcon } from './icons'
import { list, listItem } from './motion'
import { MiniBar, SectionTitle, Skeleton, StatusPill, btn, card, link } from './ui'

export type Row = { id: string; item: MaintenanceItem; status: Status; due: Due }
export type DocRow = { kind: DocKind; doc?: BikeDocument; status?: Status; days?: number }

const bigTone: Record<Status, string> = { ok: 'text-[#D4FF3A]', warn: 'text-[#FFC24D]', overdue: 'text-[#FF8A75]' }

// Il "vetro" del cruscotto: l'unico pannello scuro dell'app chiara. Prossima scadenza, contagiri a segmenti, contachilometri.
export const Cluster = ({ next, km, from, rate, onKm }: { next?: Row; km: number; from?: number; rate?: number; onKm: () => void }) => {
  const due = next?.due
  const days = due?.dueDate ? daysBetween(today(), due.dueDate) : undefined
  const over = due?.status === 'overdue'
  const big = due ? (due.kmLeft !== undefined ? int(Math.abs(due.kmLeft)) : days !== undefined ? String(Math.abs(days)) : '') : ''
  const unit = due?.kmLeft !== undefined ? (over ? 'km oltre' : 'km mancanti') : days === 1 || days === -1 ? (over ? 'giorno di ritardo' : 'giorno') : over ? 'giorni di ritardo' : 'giorni'
  const when = over ? undefined : due?.estimatedDate ? { k: 'previsto il', v: dayMonth(due.estimatedDate) } : due?.kmLeft !== undefined && due.dueDate ? { k: 'entro', v: monthYear(due.dueDate) } : undefined
  return (
    <section aria-label="Prossima manutenzione" className="relative overflow-hidden rounded-xl bg-display p-5 text-display-ink shadow-3 dark:ring-1 dark:ring-white/8 lg:p-7">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-[#D4FF3A]/[0.07] blur-3xl" />
      {due && next ? (
        <>
          <div className="relative flex items-center justify-between gap-3">
            <span className="t-label text-display-dim">Prossimo intervento</span>
            <DisplayChip status={due.status} />
          </div>
          <h2 className="t-title relative m-0 mt-3 text-[20px] lg:text-[24px]">{next.item.label}</h2>
          <div className="relative mt-1 flex items-end gap-2">
            <m.span
              className={`t-num text-[72px] leading-[0.9] lg:text-[92px] ${bigTone[due.status]}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.42 }}
            >
              {big}
            </m.span>
            <span className="mb-2 max-w-[6.5em] text-[15px] leading-tight text-display-dim">{unit}</span>
            {when && (
              <span className="mb-2 ml-auto text-right text-[13px] leading-snug text-display-dim">
                {when.k}<br /><b className="text-[15px] font-semibold text-display-ink">{when.v}</b>
              </span>
            )}
          </div>
          <div className="relative mt-4"><RevBar key={`${next.id}-${km}`} progress={due.progress} status={due.status} /></div>
          <p className="relative m-0 mt-2 text-[12px] text-display-dim">
            {over ? `Era da fare ${[due.dueKm !== undefined && `a ${fmtKm(due.dueKm)}`, due.dueDate && `entro ${monthYear(due.dueDate)}`].filter(Boolean).join(' o ')}` : dueRule(due)}
            <span className="sr-only">. {Math.round(due.progress * 100)}% dell'intervallo consumato</span>
          </p>
        </>
      ) : (
        <div className="relative grid gap-2">
          <span className="t-label text-display-dim">Manutenzione</span>
          <h2 className="t-title m-0 text-[20px]">Nessuna voce da seguire</h2>
          <p className="m-0 text-[14px] text-display-dim">Aggiungi gli intervalli dal libretto per vedere qui la prossima scadenza.</p>
          <div className="mt-2"><RevBar progress={0} status="ok" /></div>
        </div>
      )}
      <div className="relative mt-5 flex items-center justify-between gap-3 border-t border-white/8 pt-4">
        <div className="grid min-w-0">
          <span className="t-label text-display-dim">Contachilometri</span>
          <span className="t-num mt-1 whitespace-nowrap text-[30px] text-display-ink">
            <Odometer key={km} value={km} from={from} />
            <span className="ml-1.5 text-[15px] font-medium text-display-dim">km</span>
          </span>
          {/* Media degli ultimi 90 giorni: è lei a stimare le date delle scadenze a km */}
          <span className="text-[12px] text-display-dim">{rate !== undefined && rate > 0 ? rate < 1 ? 'meno di 1 km al giorno' : `circa ${int(Math.round(rate))} km al giorno` : 'Aggiorna i km per stimare le date'}</span>
        </div>
        <button type="button" onClick={onKm} className={`${btn.primary} shrink-0 px-5`}>
          <Plus size={18} strokeWidth={2.6} />Aggiorna km
        </button>
      </div>
    </section>
  )
}

export const ItemRow = ({ row, onOpen }: { row: Row; onOpen?: () => void }) => {
  const Icon = itemIcon(row.item.item)
  const s = row.status
  const tone = s === 'overdue' ? 'text-red-ink' : s === 'warn' ? 'text-amber-ink' : 'text-ink-2'
  return (
    <m.li variants={listItem}>
      <button type="button" onClick={onOpen} className="grid w-full grid-cols-[40px_1fr_auto] items-center gap-x-3 gap-y-2 rounded-md px-3 py-3 text-left transition-colors hover:bg-sunken/70">
        <span className={`grid size-10 place-items-center rounded-[12px] ${s === 'overdue' ? 'bg-red-soft text-red-ink' : s === 'warn' ? 'bg-amber-soft text-amber-ink' : 'bg-sunken text-ink'}`}>
          <Icon size={19} strokeWidth={2} />
        </span>
        <span className="grid min-w-0">
          <span className="text-[15px] font-semibold leading-snug">{row.item.label}</span>
          <span className="truncate text-[13px] text-ink-3">{every(row.item)}</span>
        </span>
        <span className={`text-right text-[14px] font-semibold ${tone}`}>
          {dueShort(row.due)}
          {s !== 'ok' && <span className="sr-only"> ({s === 'warn' ? 'in scadenza' : 'scaduta'})</span>}
        </span>
        <span className="col-start-2 col-end-4"><MiniBar progress={row.due.progress} status={s} /></span>
      </button>
    </m.li>
  )
}

const DocTile = ({ d, onOpen }: { d: DocRow; onOpen: () => void }) => {
  const meta = DOC[d.kind]
  const Icon = meta.icon
  return (
    <m.button type="button" variants={listItem} onClick={onOpen}
      className={`${d.doc ? card : 'rounded-lg border border-dashed border-line-strong'} grid min-w-[148px] flex-1 gap-3 p-4 text-left transition-shadow hover:shadow-2`}>
      <span className="flex items-center justify-between gap-2">
        <span className="grid size-9 place-items-center rounded-[10px] bg-sunken text-ink"><Icon size={18} /></span>
        {d.doc && d.status && d.status !== 'ok' && d.days !== undefined && <StatusPill status={d.status}>{d.days < 0 ? (d.kind === 'bollo' ? 'scaduto' : 'scaduta') : d.days === 0 ? 'oggi' : `${d.days} gg`}</StatusPill>}
      </span>
      <span className="grid">
        <span className="text-[13px] text-ink-3">{meta.label}</span>
        <span className="t-title text-[17px]">{d.doc ? fullDate(d.doc.dueDate) : 'Aggiungi'}</span>
        {d.doc && d.days !== undefined && d.status === 'ok' && <span className="text-[12px] text-ink-3">{daysText(d.days, d.kind === 'bollo')}</span>}
      </span>
    </m.button>
  )
}

export const Dashboard = ({ next, rows, docs, last, labelOf, km, from, rate, onKm, go }: {
  next?: Row
  rows: Row[]
  docs: DocRow[]
  last?: Service
  labelOf: (id: string) => string
  km: number
  from?: number
  rate?: number
  onKm: () => void
  go: (to: 'maint' | 'services' | 'documents') => void
}) => (
  <div className="grid gap-6 lg:grid-cols-12">
    <div className="lg:col-span-7"><Cluster next={next} km={km} from={from} rate={rate} onKm={onKm} /></div>
    <m.section aria-labelledby="h-docs" className="grid content-start gap-3 lg:col-span-5" variants={list} initial="initial" animate="animate">
      <SectionTitle id="h-docs" action={<button type="button" onClick={() => go('documents')} className={link}>Documenti<ChevronRight size={16} /></button>}>Scadenze</SectionTitle>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar lg:mx-0 lg:grid lg:overflow-visible lg:px-0">
        {DOC_KINDS.map((k) => <DocTile key={k} d={docs.find((d) => d.kind === k) ?? { kind: k }} onOpen={() => go('documents')} />)}
      </div>
    </m.section>
    {rows.length > 0 && (
      <section aria-labelledby="h-watch" className="grid content-start gap-3 lg:col-span-7">
        <SectionTitle id="h-watch" action={<button type="button" onClick={() => go('maint')} className={link}>Intervalli<ChevronRight size={16} /></button>}>Da tenere d'occhio</SectionTitle>
        <div className={`${card} p-1.5`}>
          <m.ul className="m-0 grid list-none divide-y divide-line p-0" variants={list} initial="initial" animate="animate">
            {rows.map((r) => <ItemRow key={r.id} row={r} onOpen={() => go('maint')} />)}
          </m.ul>
        </div>
      </section>
    )}
    <section aria-labelledby="h-last" className="grid content-start gap-3 lg:col-span-5">
      <SectionTitle id="h-last" action={<button type="button" onClick={() => go('services')} className={link}>Libretto<ChevronRight size={16} /></button>}>Ultimo intervento</SectionTitle>
      {last ? (
        <button type="button" onClick={() => go('services')} className={`${card} grid gap-3 p-4 text-left transition-shadow hover:shadow-2`}>
          <span className="flex items-baseline justify-between gap-3"><b className="t-title text-[16px]">{fullDate(last.date)}</b><span className="text-[13px] text-ink-3">{fmtKm(last.km)}</span></span>
          <span className="text-[14px] text-ink-2">{last.itemIds.map(labelOf).join(' · ') || 'Intervento'}</span>
          {(last.attachmentIds.length > 0 || last.costTotal !== undefined) && (
            <span className="flex items-center justify-between border-t border-line pt-3 text-[13px]">
              <span className="flex items-center gap-1.5 text-ink-3">{last.attachmentIds.length > 0 && <><FileText size={15} />{last.attachmentIds.length === 1 ? '1 allegato' : `${last.attachmentIds.length} allegati`}</>}</span>
              <b className="font-semibold">{eur(last.costTotal)}</b>
            </span>
          )}
        </button>
      ) : (
        <button type="button" onClick={() => go('services')} className="grid grid-cols-[40px_1fr_auto] items-center gap-3 rounded-lg border border-dashed border-line-strong p-4 text-left">
          <span className="grid size-10 place-items-center rounded-[12px] bg-lime-soft text-lime-ink"><Wrench size={19} /></span>
          <span className="grid"><b className="text-[15px] font-semibold">Registra il primo intervento</b><span className="text-[13px] text-ink-3">I conteggi ripartono dall'ultimo tagliando</span></span>
          <ChevronRight size={18} className="text-ink-3" />
        </button>
      )}
    </section>
  </div>
)

export const DashboardSkeleton = () => (
  <div className="grid gap-6" aria-busy="true" aria-label="Caricamento">
    <div className="grid gap-4 rounded-xl bg-display p-5">
      <div className="h-3 w-32 rounded bg-white/8" /><div className="h-6 w-48 rounded bg-white/8" /><div className="h-16 w-36 rounded bg-white/8" />
      <div className="grid grid-cols-[repeat(28,1fr)] gap-[3px]">{Array.from({ length: 28 }, (_, i) => <i key={i} className="h-7 rounded-[3px] bg-white/6" />)}</div>
      <div className="flex justify-between pt-3"><div className="h-9 w-40 rounded bg-white/8" /><div className="h-12 w-36 rounded-full bg-white/8" /></div>
    </div>
    <div className="grid gap-3"><Skeleton className="h-5 w-28" /><div className="flex gap-3"><Skeleton className="h-28 flex-1" /><Skeleton className="h-28 flex-1" /></div></div>
    <div className="grid gap-3"><Skeleton className="h-5 w-40" />{[0, 1, 2].map((i) => <div key={i} className="flex items-center gap-3"><Skeleton className="size-10 rounded-[12px]" /><div className="grid flex-1 gap-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/3" /></div></div>)}</div>
  </div>
)
