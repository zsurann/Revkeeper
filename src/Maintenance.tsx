import { AnimatePresence, m } from 'motion/react'
import { BookOpen, ChevronDown, Plus, Trash2, Wrench } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { Row } from './Dashboard'
import { remove, save } from './db'
import { DATA, findModel, itemsFor } from './domain/intervals'
import type { Bike, MaintenanceItem } from './domain/types'
import { dueRule, dueShort, every } from './format'
import { itemIcon } from './icons'
import { list, listItem } from './motion'
import { toast } from './toast'
import { Empty, ErrorText, MiniBar, PageHead, StatusPill, area, btn, card, field } from './ui'

const int = (v: FormDataEntryValue | null) => {
  const s = String(v ?? '').trim()
  if (s === '') return undefined
  const n = Number(s.replace(/\./g, ''))
  if (!Number.isInteger(n) || n <= 0) throw new RangeError('Usa numeri interi maggiori di zero')
  return n
}
const ORIGIN = { model: 'Dal libretto', preset: 'Valore tipico', user: 'Personalizzata' } as const

const ItemCard = ({ item, row, onChange }: { item: MaintenanceItem; row?: Row; onChange: () => void }) => {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const Icon = itemIcon(item.item)
  const s = row?.status ?? 'ok'
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    try {
      const km = int(f.get('km'))
      const months = int(f.get('months'))
      if (km === undefined && months === undefined) throw new RangeError('Serve almeno km o mesi')
      const notes = String(f.get('notes') ?? '').trim() || undefined
      // Cambiare solo la nota non rende "personalizzato" un intervallo preso dal libretto
      const origin = km === item.km && months === item.months ? item.origin : 'user'
      await save('items', { ...item, km, months, notes, origin })
      setError('')
      setOpen(false)
      toast('Voce aggiornata', { body: item.label })
      onChange()
    } catch (err) {
      setError(err instanceof RangeError ? err.message : 'Salvataggio non riuscito')
    }
  }
  return (
    <m.li variants={listItem} className={`${card} overflow-hidden`}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="grid w-full grid-cols-[40px_1fr_auto] items-center gap-x-3 gap-y-2 p-4 text-left">
        <span className={`grid size-10 place-items-center rounded-[12px] ${s === 'overdue' ? 'bg-red-soft text-red-ink' : s === 'warn' ? 'bg-amber-soft text-amber-ink' : 'bg-sunken text-ink'}`}><Icon size={19} /></span>
        <span className="grid min-w-0">
          <span className="text-[15px] font-semibold leading-snug">{item.label}</span>
          <span className="text-[13px] text-ink-3">{every(item)} · {ORIGIN[item.origin]}</span>
          {item.notes && <span className="truncate text-[13px] italic text-ink-2">{item.notes}</span>}
        </span>
        <span className="flex items-center gap-2">
          {row && s !== 'ok' ? <StatusPill status={s}>{dueShort(row.due)}</StatusPill> : row && <span className="text-[13px] font-semibold text-ink-2">{dueShort(row.due)}</span>}
          <m.span animate={{ rotate: open ? 180 : 0 }} className="text-ink-3"><ChevronDown size={18} /></m.span>
        </span>
        {row && <span className="col-start-2 col-end-4"><MiniBar progress={row.due.progress} status={s} /></span>}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <m.form
            onSubmit={submit}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="grid gap-3 border-t border-line px-4 pb-4 pt-3">
              {row && <p className="m-0 text-[13px] text-ink-3">Prossima: {dueRule(row.due)}</p>}
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5 text-[13px] font-medium text-ink-2">Ogni km
                  <input id={`km-${item.id}`} name="km" inputMode="numeric" pattern="[0-9.]*" defaultValue={item.km} className={field} />
                </label>
                <label className="grid gap-1.5 text-[13px] font-medium text-ink-2">Ogni mesi
                  <input id={`months-${item.id}`} name="months" inputMode="numeric" pattern="[0-9]*" defaultValue={item.months} className={field} />
                </label>
              </div>
              <label className="grid gap-1.5 text-[13px] font-medium text-ink-2">Note
                <textarea id={`notes-${item.id}`} name="notes" rows={2} maxLength={2000} defaultValue={item.notes} placeholder="Es. olio 10W-40, filtro HF204, coppia 25 Nm" className={area} />
              </label>
              {error && <ErrorText>{error}</ErrorText>}
              <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={() => void remove('items', item.id).then(() => { toast('Voce rimossa', { kind: 'info', body: item.label }); onChange() })} className={`${btn.ghost} -ml-2 text-red-ink hover:bg-red-soft`}>
                  <Trash2 size={16} />Rimuovi
                </button>
                <button className={btn.ink}>Salva</button>
              </div>
            </div>
          </m.form>
        )}
      </AnimatePresence>
    </m.li>
  )
}

export const Maintenance = ({ bike, items, rows, onChange }: { bike: Bike; items: MaintenanceItem[]; rows: Row[]; onChange: () => void }) => {
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
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
      setAdding(false)
      toast('Voce aggiunta', { body: label })
      onChange()
    } catch (err) {
      setError(err instanceof RangeError ? err.message : 'Salvataggio non riuscito')
    }
  }
  const modelManual = findModel(DATA, bike.make, bike.model, bike.year)
  const manualSource = modelManual?.source as { title?: string; page?: number; url?: string } | undefined
  const sorted = [...items].sort((a, b) => rows.findIndex((r) => r.id === a.id) - rows.findIndex((r) => r.id === b.id))
  return (
    <>
      <PageHead title="Manutenzione" sub="Ogni voce scade al primo traguardo tra km e mesi." action={!adding && <button type="button" onClick={() => setAdding(true)} className={`${btn.primary} h-11 px-5`}><Plus size={18} strokeWidth={2.6} />Voce</button>} />
      {modelManual && items.some((i) => i.origin !== 'model') && (
        <button
          type="button"
          onClick={() => void Promise.all(items.map((i) => remove('items', i.id))).then(() => Promise.all(itemsFor(bike).map((i) => save('items', i)))).then(() => { toast('Intervalli del libretto applicati'); onChange() })}
          className={`${card} flex items-center gap-3 p-4 text-left`}
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-lime-soft text-lime-ink"><BookOpen size={19} /></span>
          <span className="grid"><b className="text-[15px] font-semibold">Usa gli intervalli del libretto</b><span className="text-[13px] text-ink-3">{bike.make} {bike.model} · sostituisce le voci attuali</span></span>
        </button>
      )}
      <AnimatePresence initial={false}>
        {adding && (
          <m.form onSubmit={add} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={`${card} grid gap-3 p-4`}>
            <b className="t-title text-[17px]">Nuova voce</b>
            <input id="new-label" name="label" placeholder="Es. Pastiglie freni anteriori" className={field} autoFocus />
            <div className="grid grid-cols-2 gap-3">
              <input id="new-km" name="km" inputMode="numeric" pattern="[0-9.]*" placeholder="Ogni km" aria-label="Ogni km" className={field} />
              <input id="new-months" name="months" inputMode="numeric" pattern="[0-9]*" placeholder="Ogni mesi" aria-label="Ogni mesi" className={field} />
            </div>
            {error && <ErrorText>{error}</ErrorText>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setAdding(false); setError('') }} className={btn.ghost}>Annulla</button>
              <button className={btn.primary}>Aggiungi voce</button>
            </div>
          </m.form>
        )}
      </AnimatePresence>
      {sorted.length === 0 && !adding ? (
        <Empty
          icon={<Wrench size={28} />}
          title="Nessuna voce di manutenzione"
          text="Aggiungi le voci da tenere d'occhio, come olio o catena: ti avvisiamo prima che scadano."
          action={<button type="button" onClick={() => setAdding(true)} className={btn.primary}><Plus size={18} strokeWidth={2.6} />Aggiungi voce</button>}
        />
      ) : (
        <m.ul className="m-0 grid list-none gap-3 p-0" variants={list} initial="initial" animate="animate">
          {sorted.map((i) => <ItemCard key={i.id} item={i} row={rows.find((r) => r.id === i.id)} onChange={onChange} />)}
        </m.ul>
      )}
      <div className="grid gap-1 px-1 text-[13px] text-ink-3">
        {manualSource?.title && items.some((i) => i.origin === 'model') && (
          <p className="m-0">
            Fonte intervalli:{' '}
            {manualSource.url && /^https?:\/\//.test(manualSource.url) ? (
              <a href={manualSource.url} target="_blank" rel="noopener noreferrer" className="underline decoration-ink-3 underline-offset-2 hover:text-ink">{manualSource.title}</a>
            ) : manualSource.title}
            {manualSource.page ? ` (pag. ${manualSource.page})` : ''}.
          </p>
        )}
        <p className="m-0">I valori tipici sono indicativi: controlla il libretto della tua moto.</p>
      </div>
    </>
  )
}
