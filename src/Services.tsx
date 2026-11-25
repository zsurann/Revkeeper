import { AnimatePresence, motion } from 'motion/react'
import { Check, NotebookPen, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { AttachmentLink, AttachmentPicker, usePending } from './Attachments'
import { addReading, remove, save } from './db'
import { serviceFromForm } from './domain/serviceForm'
import type { Bike, MaintenanceItem, Service } from './domain/types'
import { eur, fullDate, km as fmtKm, today } from './format'
import { itemIcon } from './icons'
import { dur, ease, list, listItem } from './motion'
import { toast } from './toast'
import { Celebrate, Empty, ErrorText, Field, PageHead, Sheet, area, btn, card, field } from './ui'

const ServiceForm = ({ bike, km, items, onSaved }: { bike: Bike; km: number; items: MaintenanceItem[]; onSaved: (labels: string[], km: number) => void }) => {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const files = usePending()
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setBusy(true)
    try {
      const draft = serviceFromForm(new FormData(e.currentTarget), bike.id, today())
      const attachmentIds = await files.persist()
      await save('services', { ...draft, attachmentIds })
      if (draft.km > km) await addReading(bike, draft.date, draft.km) // l'intervento aggiorna anche il contachilometri
      onSaved(draft.itemIds.map((id) => items.find((i) => i.id === id)?.label ?? ''), draft.km)
    } catch (err) {
      setError(err instanceof RangeError ? err.message : 'Salvataggio non riuscito')
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} className="grid gap-4 pb-1">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Data"><input id="svc-date" name="date" type="date" required max={today()} defaultValue={today()} className={field} /></Field>
        <Field label="Km"><input id="svc-km" name="km" required inputMode="numeric" pattern="[0-9]*" defaultValue={km} className={field} /></Field>
      </div>
      <fieldset className="m-0 grid gap-2 border-0 p-0">
        <legend className="mb-2 text-[13px] font-medium text-ink-2">Cosa hai fatto</legend>
        <div className="flex flex-wrap gap-2">
          {items.map((i) => {
            const Icon = itemIcon(i.item)
            return (
              <label key={i.id} className="group relative inline-flex h-10 items-center gap-2 rounded-full bg-surface px-3.5 text-[14px] font-medium text-ink ring-1 ring-line-strong transition-colors has-checked:bg-ink has-checked:text-bg has-checked:ring-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink">
                <input type="checkbox" name="itemIds" value={i.id} className="peer sr-only" />
                <Icon size={15} className="peer-checked:hidden" />
                <Check size={15} strokeWidth={2.8} className="hidden text-lime peer-checked:block dark:text-[#4A6400]" />
                {i.label}
              </label>
            )
          })}
        </div>
      </fieldset>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Ricambi €"><input id="svc-parts" name="costParts" inputMode="decimal" className={field} /></Field>
        <Field label="Manodopera €"><input id="svc-labour" name="costLabour" inputMode="decimal" className={field} /></Field>
        <Field label="Totale €"><input id="svc-total" name="costTotal" inputMode="decimal" placeholder="somma" className={field} /></Field>
      </div>
      <Field label="Note"><textarea id="svc-notes" name="notes" rows={2} placeholder="Officina, ricambi usati…" className={area} /></Field>
      <AttachmentPicker id="svc-files" p={files} />
      {error && <ErrorText>{error}</ErrorText>}
      <button className={`${btn.primary} w-full`} disabled={busy}><Check size={18} strokeWidth={2.6} />Salva intervento</button>
    </form>
  )
}

const ServiceCard = ({ s, label, onRemove }: { s: Service; label: (id: string) => string; onRemove: () => void }) => {
  const [ask, setAsk] = useState(false)
  return (
    <motion.li variants={listItem} layout exit={{ opacity: 0, x: -40, transition: { duration: dur.base } }} className={`${card} grid gap-3 p-4`}>
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
          <button type="button" onClick={() => setAsk(true)} className="-ml-2 grid size-9 place-items-center rounded-full text-ink-2 hover:bg-sunken" aria-label={`Elimina l'intervento del ${fullDate(s.date)}`}><Trash2 size={16} /></button>
        )}
        <span className="grid justify-items-end text-right">
          {(s.costParts !== undefined || s.costLabour !== undefined) && (
            <span className="text-[12px] text-ink-3">{[s.costParts !== undefined && `ricambi ${eur(s.costParts)}`, s.costLabour !== undefined && `manodopera ${eur(s.costLabour)}`].filter(Boolean).join(' · ')}</span>
          )}
          {s.costTotal !== undefined && <b className="t-num text-[20px]">{eur(s.costTotal)}</b>}
        </span>
      </div>
    </motion.li>
  )
}

export const Services = ({ bike, km, items, services, onChange }: {
  bike: Bike
  km: number
  items: MaintenanceItem[]
  services: Service[]
  onChange: () => void
}) => {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState<{ labels: string[]; km: number }>()
  const label = (id: string) => items.find((i) => i.id === id)?.label ?? 'Voce rimossa'
  const sorted = [...services].sort((a, b) => b.date.localeCompare(a.date) || b.km - a.km)
  const year = today().slice(0, 4)
  const spent = services.reduce((s, x) => s + (x.costTotal ?? 0), 0)
  const spentYear = services.filter((s) => s.date.startsWith(year)).reduce((s, x) => s + (x.costTotal ?? 0), 0)
  const since = sorted.at(-1)?.date.slice(0, 4)
  const close = () => { setOpen(false); setTimeout(() => setDone(undefined), 250) }
  return (
    <>
      <PageHead title="Interventi" sub="Il libretto della tua moto: utile anche quando la vendi." action={<button type="button" onClick={() => setOpen(true)} className={`${btn.primary} h-11 px-5`}><Plus size={18} strokeWidth={2.6} />Registra</button>} />
      {spent > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className={`${card} grid gap-1 p-4`}><span className="text-[13px] text-ink-3">Speso nel {year}</span><b className="t-num text-[28px]">{eur(spentYear)}</b></div>
          <div className={`${card} grid gap-1 p-4`}><span className="text-[13px] text-ink-3">Totale dal {since}</span><b className="t-num text-[28px]">{eur(spent)}</b></div>
        </div>
      )}
      {sorted.length === 0 ? (
        <Empty
          icon={<NotebookPen size={28} />}
          title="Nessun intervento registrato"
          text="Registra il prossimo tagliando: i conteggi delle scadenze ripartono da lì."
          action={<button type="button" onClick={() => setOpen(true)} className={btn.primary}><Plus size={18} strokeWidth={2.6} />Registra intervento</button>}
        />
      ) : (
        <motion.ul className="m-0 grid list-none gap-3 p-0" variants={list} initial="initial" animate="animate">
          <AnimatePresence initial={false}>
            {sorted.map((s) => (
              <ServiceCard key={s.id} s={s} label={label} onRemove={() => void remove('services', s.id).then(() => { toast('Intervento eliminato', { kind: 'info' }); onChange() })} />
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
      <Sheet open={open} onClose={close} title={done ? 'Fatto' : 'Nuovo intervento'}>
        {done ? (
          <div className="grid justify-items-center pb-2 text-center">
            <Celebrate />
            <motion.h3 className="t-title m-0 -mt-4 text-[22px]" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: dur.slow, ease: ease.out }}>Intervento registrato</motion.h3>
            <motion.p className="m-0 mt-1.5 max-w-[32ch] text-[14px] text-ink-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
              {done.labels.filter(Boolean).join(', ')} {done.labels.length === 1 ? 'riparte' : 'ripartono'} da zero a {fmtKm(done.km)}.
            </motion.p>
            <button type="button" onClick={close} className={`${btn.ink} mt-6 w-full`}>Chiudi</button>
          </div>
        ) : (
          <ServiceForm bike={bike} km={km} items={items} onSaved={(labels, k) => { setDone({ labels, km: k }); toast('Intervento salvato', { body: labels.filter(Boolean).join(', ') }); onChange() }} />
        )}
      </Sheet>
    </>
  )
}
