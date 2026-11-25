import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { AttachmentLink, AttachmentPicker, usePending } from './Attachments'
import { save } from './db'
import { daysBetween, documentStatus } from './domain/due'
import { DEFAULT_THRESHOLDS, type Bike, type BikeDocument, type DocKind } from './domain/types'
import { daysText, fullDate, today } from './format'
import { DOC, DOC_KINDS } from './icons'
import { list, listItem } from './motion'
import { toast } from './toast'
import { ErrorText, PageHead, StatusPill, btn, card, field } from './ui'

const DocCard = ({ bike, kind, doc, onChange }: { bike: Bike; kind: DocKind; doc?: BikeDocument; onChange: () => void }) => {
  const files = usePending()
  const [error, setError] = useState('')
  const meta = DOC[kind]
  const Icon = meta.icon
  const status = doc ? documentStatus(doc, today(), DEFAULT_THRESHOLDS) : undefined
  const days = doc ? daysBetween(today(), doc.dueDate) : undefined
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const dueDate = String(new FormData(e.currentTarget).get('dueDate') ?? '')
    if (!dueDate) return setError('Inserisci la data di scadenza')
    const ids = await files.persist()
    await save('documents', { ...doc, bikeId: bike.id, kind, dueDate, attachmentIds: [...(doc?.attachmentIds ?? []), ...ids] })
    files.clear()
    setError('')
    toast(`${meta.label} ${kind === 'bollo' ? 'salvato' : 'salvata'}`, { body: `Scadenza ${fullDate(dueDate)}` })
    onChange()
  }
  return (
    <motion.form variants={listItem} onSubmit={submit} className={`${card} grid gap-4 p-4`}>
      <div className="flex items-center gap-3">
        <span className={`grid size-11 shrink-0 place-items-center rounded-[12px] ${status === 'overdue' ? 'bg-red-soft text-red-ink' : status === 'warn' ? 'bg-amber-soft text-amber-ink' : 'bg-sunken text-ink'}`}><Icon size={20} /></span>
        <span className="grid min-w-0 flex-1">
          <b className="t-title text-[17px]">{meta.label}</b>
          <span className="text-[13px] text-ink-3">{doc ? `Scade il ${fullDate(doc.dueDate)}` : meta.hint}</span>
        </span>
        {doc && status && days !== undefined && (status === 'ok' ? <span className="text-[12px] font-semibold text-ink-3">{daysText(days, kind === 'bollo')}</span> : <StatusPill status={status}>{daysText(days, kind === 'bollo')}</StatusPill>)}
      </div>
      <label className="grid gap-1.5 text-[13px] font-medium text-ink-2">
        Scadenza
        <input id={`doc-${kind}`} name="dueDate" type="date" defaultValue={doc?.dueDate} className={field} />
      </label>
      {doc && doc.attachmentIds.length > 0 && <div className="flex flex-wrap gap-2">{doc.attachmentIds.map((id) => <AttachmentLink key={id} id={id} />)}</div>}
      <AttachmentPicker id={`doc-files-${kind}`} p={files} />
      {error && <ErrorText>{error}</ErrorText>}
      <button className={`${btn.ink} w-full`}><Check size={17} strokeWidth={2.6} />Salva</button>
    </motion.form>
  )
}

export const Documents = ({ bike, documents, onChange }: { bike: Bike; documents: BikeDocument[]; onChange: () => void }) => (
  <>
    <PageHead title="Documenti" sub={`${bike.make} ${bike.model}${bike.plate ? ` · ${bike.plate}` : ''} · ti avvisiamo 30 giorni, 7 giorni e il giorno stesso.`} />
    <motion.div className="grid gap-3 lg:grid-cols-3" variants={list} initial="initial" animate="animate">
      {DOC_KINDS.map((k) => <DocCard key={k} bike={bike} kind={k} doc={documents.find((d) => d.kind === k)} onChange={onChange} />)}
    </motion.div>
  </>
)
