import { AnimatePresence, m } from 'motion/react'
import { Check, ChevronDown, NotebookPen, Pencil, Plus, Printer, Search, Trash2, X } from 'lucide-react'
import { useCallback, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { AttachmentLink, AttachmentPicker, usePending, withoutAttachment } from './Attachments'
import { addReading, remove, save } from './db'
import { filterServices, serviceYears } from './domain/serviceFilter'
import { serviceFromForm } from './domain/serviceForm'
import { spendingStats } from './domain/spending'
import type { Bike, MaintenanceItem, OdometerReading, Service } from './domain/types'
import { eur, fullDate, km as fmtKm, today } from './format'
import { itemIcon } from './icons'
import { dur, ease, list, listItem } from './motion'
import { toast } from './toast'
import { PrintLog } from './PrintLog'
import { Spending } from './Spending'
import { Celebrate, Empty, ErrorText, Field, PageHead, Sheet, area, btn, card, field } from './ui'

// Nuovo intervento, o modifica di uno salvato (stesso form, valori già compilati)
const ServiceForm = ({ bike, km, items, service, onSaved }: { bike: Bike; km: number; items: MaintenanceItem[]; service?: Service; onSaved: (labels: string[], km: number) => void }) => {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sum, setSum] = useState((service?.costParts ?? 0) + (service?.costLabour ?? 0))
  const [kept, setKept] = useState(service?.attachmentIds ?? [])
  const files = usePending()
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setBusy(true)
    try {
      const draft = serviceFromForm(new FormData(e.currentTarget), bike.id, today())
      // Allegati tolti nel form: diventano tombstone solo al salvataggio, così "chiudi" non perde niente
      let ids = service?.attachmentIds ?? []
      for (const id of ids.filter((x) => !kept.includes(x))) ids = await withoutAttachment(ids, id)
      const attachmentIds = [...ids, ...(await files.persist())]
      await save('services', { ...draft, id: service?.id, attachmentIds })
      if (draft.km > km) await addReading(bike, draft.date, draft.km) // l'intervento aggiorna anche il contachilometri
      onSaved(draft.itemIds.map((id) => items.find((i) => i.id === id)?.label ?? ''), draft.km)
    } catch (err) {
      setError(err instanceof RangeError ? err.message : 'Salvataggio non riuscito')
    } finally {
      setBusy(false)
    }
  }
  const money = (v?: number) => (v === undefined ? undefined : String(v).replace('.', ','))
  return (
    <form onSubmit={submit} className="grid gap-4 pb-1">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Data"><input id="svc-date" name="date" type="date" required max={today()} defaultValue={service?.date ?? today()} className={field} /></Field>
        <Field label="Km"><input id="svc-km" name="km" required inputMode="numeric" pattern="[0-9. ]*" defaultValue={service?.km ?? km} className={field} /></Field>
      </div>
      <fieldset className="m-0 grid gap-2 border-0 p-0">
        <legend className="mb-2 text-[13px] font-medium text-ink-2">Cosa hai fatto</legend>
        <div className="flex flex-wrap gap-2">
          {[...items].sort((a, b) => a.label.localeCompare(b.label, 'it')).map((i) => {
            const Icon = itemIcon(i.item)
            return (
              <label key={i.id} className="group relative inline-flex h-10 items-center gap-2 rounded-full bg-surface px-3.5 text-[14px] font-medium text-ink ring-1 ring-line-strong transition-colors has-checked:bg-ink has-checked:text-bg has-checked:ring-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink">
                <input type="checkbox" name="itemIds" value={i.id} defaultChecked={service?.itemIds.includes(i.id)} className="peer sr-only" />
                <Icon size={15} className="peer-checked:hidden" />
                <Check size={15} strokeWidth={2.8} className="hidden text-lime peer-checked:block dark:text-[#4A6400]" />
                {i.label}
              </label>
            )
          })}
        </div>
      </fieldset>
      <div className="grid grid-cols-3 gap-2" onInput={(e) => {
        const f = e.currentTarget.querySelectorAll('input')
        const n = (i: number) => Number(f[i]!.value.replace(',', '.')) || 0
        setSum(n(0) + n(1))
      }}>
        <Field label="Ricambi €"><input id="svc-parts" name="costParts" inputMode="decimal" defaultValue={money(service?.costParts)} className={field} /></Field>
        <Field label="Manodopera €"><input id="svc-labour" name="costLabour" inputMode="decimal" defaultValue={money(service?.costLabour)} className={field} /></Field>
        <Field label="Totale €"><input id="svc-total" name="costTotal" inputMode="decimal" defaultValue={money(service?.costTotal)} placeholder={sum > 0 ? eur(sum) : 'somma'} className={field} /></Field>
      </div>
      <Field label="Note"><textarea id="svc-notes" name="notes" rows={2} placeholder="Officina, ricambi usati…" defaultValue={service?.notes} className={area} /></Field>
      {kept.length > 0 && <div className="flex flex-wrap gap-2">{kept.map((id) => <AttachmentLink key={id} id={id} onRemove={(x) => setKept((k) => k.filter((y) => y !== x))} />)}</div>}
      <AttachmentPicker id="svc-files" p={files} />
      {error && <ErrorText>{error}</ErrorText>}
      <button className={`${btn.primary} w-full`} disabled={busy}><Check size={18} strokeWidth={2.6} />{service ? 'Salva modifiche' : 'Salva intervento'}</button>
    </form>
  )
}

const ServiceCard = ({ s, label, onRemove, onEdit }: { s: Service; label: (id: string) => string; onRemove: () => void; onEdit: () => void }) => {
  const [ask, setAsk] = useState(false)
  return (
    <m.li variants={listItem} layout exit={{ opacity: 0, x: -40, transition: { duration: dur.base } }} className={`${card} grid gap-3 p-4`}>
      <div className="flex items-baseline justify-between gap-3">
        <b className="t-title text-[17px]">{fullDate(s.date)}</b>
        <span className="text-[13px] text-ink-3">{fmtKm(s.km)}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {s.itemIds.map((id) => <span key={id} className="rounded-full bg-sunken px-2.5 py-1 text-[13px] font-medium text-ink-2">{label(id)}</span>)}
      </div>
      {s.notes && <p className="m-0 text-[14px] text-ink-2">{s.notes}</p>}
      {s.attachmentIds.length > 0 && <div className="flex flex-wrap gap-2">{s.attachmentIds.map((id) => <AttachmentLink key={id} id={id} />)}</div>}
      <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
        {ask ? (
          <span className="flex items-center gap-2">
            <button type="button" onClick={onRemove} className={`${btn.danger} h-9 px-4 text-[13px]`}>Elimina</button>
            <button type="button" onClick={() => setAsk(false)} className={`${btn.ghost} h-9`}>Annulla</button>
          </span>
        ) : (
          <span className="-ml-2 flex items-center">
            <button type="button" onClick={onEdit} className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-sunken" aria-label={`Modifica l'intervento del ${fullDate(s.date)}`}><Pencil size={16} /></button>
            <button type="button" onClick={() => setAsk(true)} className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-sunken" aria-label={`Elimina l'intervento del ${fullDate(s.date)}`}><Trash2 size={16} /></button>
          </span>
        )}
        <span className="grid justify-items-end text-right">
          {(s.costParts !== undefined || s.costLabour !== undefined) && (
            <span className="text-[12px] text-ink-3">{[s.costParts !== undefined && `ricambi ${eur(s.costParts)}`, s.costLabour !== undefined && `manodopera ${eur(s.costLabour)}`].filter(Boolean).join(' · ')}</span>
          )}
          {s.costTotal !== undefined && <b className="t-num text-[20px]">{eur(s.costTotal)}</b>}
        </span>
      </div>
    </m.li>
  )
}

const select = 'h-10 max-w-full appearance-none truncate rounded-full bg-sunken pl-4 pr-9 text-[14px] font-medium text-ink ring-1 ring-transparent focus:outline-none focus:ring-2 focus:ring-ink dark:focus:ring-lime'
const Select = ({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode }) => (
  <span className="relative inline-flex min-w-0 max-w-full">
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={`${select} ${value ? 'bg-ink text-bg' : ''}`}>{children}</select>
    <ChevronDown size={15} aria-hidden="true" className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${value ? 'text-bg' : 'text-ink-3'}`} />
  </span>
)

export const Services = ({ bike, km, items, services, readings, onChange }: {
  bike: Bike
  km: number
  items: MaintenanceItem[]
  services: Service[]
  readings: OdometerReading[]
  onChange: () => void
}) => {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Service>()
  const [done, setDone] = useState<{ labels: string[]; km: number; edit: boolean }>()
  const [q, setQ] = useState('')
  const [year, setYear] = useState('')
  const [itemId, setItemId] = useState('')
  const [printing, setPrinting] = useState(false)
  const label = (id: string) => items.find((i) => i.id === id)?.label ?? 'Voce rimossa'
  const sorted = useMemo(() => [...services].sort((a, b) => b.date.localeCompare(a.date) || b.km - a.km), [services])
  const shown = filterServices(sorted, items, { q, year, itemId })
  const filtering = Boolean(q || year || itemId)
  const stats = useMemo(() => spendingStats(bike, services, items, readings), [bike, services, items, readings])
  const years = serviceYears(services)
  const usedItems = items.filter((i) => services.some((s) => s.itemIds.includes(i.id)))
  const stopPrint = useCallback(() => setPrinting(false), [])
  const openNew = () => { setEditing(undefined); setOpen(true) }
  const close = () => { setOpen(false); setTimeout(() => { setDone(undefined); setEditing(undefined) }, 250) }
  const reset = () => { setQ(''); setYear(''); setItemId('') }
  return (
    <>
      <PageHead title="Interventi" sub="Il libretto della tua moto: utile anche quando la vendi." action={<button type="button" onClick={openNew} className={`${btn.primary} h-11 px-5`}><Plus size={18} strokeWidth={2.6} />Registra</button>} />
      {stats.total > 0 && <Spending s={stats} year={today().slice(0, 4)} />}
      {sorted.length === 0 ? (
        <Empty
          icon={<NotebookPen size={28} />}
          title="Nessun intervento registrato"
          text="Registra il prossimo tagliando: i conteggi delle scadenze ripartono da lì."
          action={<button type="button" onClick={openNew} className={btn.primary}><Plus size={18} strokeWidth={2.6} />Registra intervento</button>}
        />
      ) : (
        <>
          <div className="grid gap-2" role="search" aria-label="Cerca negli interventi">
            <div className="flex gap-2">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Cerca</span>
                <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
                <input id="svc-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca: officina, olio, gomme…" className={`${field} pl-10 pr-10 [&::-webkit-search-cancel-button]:appearance-none`} />
                {q && <button type="button" onClick={() => setQ('')} className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-ink-3 hover:bg-line" aria-label="Svuota la ricerca"><X size={16} /></button>}
              </label>
              <button type="button" onClick={() => setPrinting(true)} className={`${btn.secondary} h-12 shrink-0 px-4!`} aria-label="Esporta il libretto in PDF"><Printer size={17} /><span className="max-sm:hidden">PDF</span></button>
            </div>
            {(years.length > 1 || usedItems.length > 1) && (
              <div className="flex flex-wrap items-center gap-2">
                {years.length > 1 && (
                  <Select label="Anno" value={year} onChange={setYear}>
                    <option value="">Tutti gli anni</option>
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                  </Select>
                )}
                {usedItems.length > 1 && (
                  <Select label="Voce" value={itemId} onChange={setItemId}>
                    <option value="">Tutte le voci</option>
                    {usedItems.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
                  </Select>
                )}
                {filtering && <button type="button" onClick={reset} className={`${btn.ghost} px-3!`}><X size={15} />Azzera</button>}
              </div>
            )}
            {filtering && <p className="m-0 px-1 text-[13px] text-ink-3" aria-live="polite">{shown.length === 1 ? '1 intervento' : `${shown.length} interventi`}{shown.length ? ` · ${eur(shown.reduce((a, x) => a + (x.costTotal ?? 0), 0))}` : ''}</p>}
          </div>
          {shown.length === 0 ? (
            <Empty icon={<Search size={26} />} title="Nessun intervento trovato" text="Prova con un'altra parola o togli i filtri." action={<button type="button" onClick={reset} className={btn.secondary}>Mostra tutti</button>} />
          ) : (
            <m.ul className="m-0 grid list-none gap-3 p-0" variants={list} initial="initial" animate="animate">
              <AnimatePresence initial={false}>
                {shown.map((s) => (
                  <ServiceCard
                    key={s.id}
                    s={s}
                    label={label}
                    onEdit={() => { setEditing(s); setOpen(true) }}
                    onRemove={() => void remove('services', s.id).then(() => { toast('Intervento eliminato', { kind: 'info' }); onChange() })}
                  />
                ))}
              </AnimatePresence>
            </m.ul>
          )}
        </>
      )}
      {printing && <PrintLog bike={bike} services={sorted} label={label} stats={stats} onDone={stopPrint} />}
      <Sheet open={open} onClose={close} title={done ? 'Fatto' : editing ? 'Modifica intervento' : 'Nuovo intervento'}>
        {done ? (
          <div className="grid justify-items-center pb-2 text-center">
            <Celebrate />
            <m.h3 className="t-title m-0 -mt-4 text-[22px]" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: dur.slow, ease: ease.out }}>{done.edit ? 'Intervento aggiornato' : 'Intervento registrato'}</m.h3>
            <m.p className="m-0 mt-1.5 max-w-[32ch] text-[14px] text-ink-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              {done.edit ? 'Le scadenze sono state ricalcolate.' : `${done.labels.filter(Boolean).join(', ')} ${done.labels.length === 1 ? 'riparte' : 'ripartono'} da zero a ${fmtKm(done.km)}.`}
            </m.p>
            <button type="button" onClick={close} className={`${btn.ink} mt-6 w-full`}>Chiudi</button>
          </div>
        ) : (
          <ServiceForm
            key={editing?.id ?? 'new'}
            bike={bike}
            km={km}
            items={items}
            service={editing}
            onSaved={(labels, k) => { setDone({ labels, km: k, edit: !!editing }); onChange() }}
          />
        )}
      </Sheet>
    </>
  )
}
