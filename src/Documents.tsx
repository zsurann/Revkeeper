import { useState, type FormEvent } from 'react'
import { AttachmentLink, AttachmentPicker, usePending } from './Attachments'
import { save } from './db'
import { documentStatus } from './domain/due'
import { DEFAULT_THRESHOLDS, type Bike, type BikeDocument, type DocKind } from './domain/types'
import { statusColor, statusText, today } from './format'
import { field, ghost } from './ui'

const KINDS: { kind: DocKind; label: string }[] = [
  { kind: 'assicurazione', label: 'Assicurazione' },
  { kind: 'bollo', label: 'Bollo' },
  { kind: 'revisione', label: 'Revisione' },
]

const DocCard = ({ bike, kind, label, doc, onChange }: { bike: Bike; kind: DocKind; label: string; doc?: BikeDocument; onChange: () => void }) => {
  const files = usePending()
  const [msg, setMsg] = useState('')
  const status = doc ? documentStatus(doc, today(), DEFAULT_THRESHOLDS) : undefined
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const dueDate = String(new FormData(e.currentTarget).get('dueDate') ?? '')
    if (!dueDate) return setMsg('Inserisci la data di scadenza')
    const ids = await files.persist()
    await save('documents', { ...doc, bikeId: bike.id, kind, dueDate, attachmentIds: [...(doc?.attachmentIds ?? []), ...ids] })
    files.clear()
    setMsg('Salvato')
    onChange()
  }
  return (
    <form onSubmit={submit} className="grid gap-2.5 rounded-panel bg-panel p-4">
      <div className="flex items-baseline justify-between">
        <b className="font-gauge text-lg">{label}</b>
        {status && status !== 'ok' && <span className={`text-sm ${statusColor[status]}`}>{statusText[status]}</span>}
      </div>
      <label className="grid gap-1 text-sm text-dim">
        Scadenza
        <input id={`doc-${kind}`} name="dueDate" type="date" defaultValue={doc?.dueDate} className={field} />
      </label>
      <div className="flex flex-wrap gap-3">{doc?.attachmentIds.map((id) => <AttachmentLink key={id} id={id} />)}</div>
      <AttachmentPicker id={`doc-files-${kind}`} p={files} />
      <div className="flex items-center gap-3">
        <button className={ghost}>Salva</button>
        {msg && <span role="status" className="text-sm text-dim">{msg}</span>}
      </div>
    </form>
  )
}

export const Documents = ({ bike, documents, onChange }: { bike: Bike; documents: BikeDocument[]; onChange: () => void }) => (
  <>
    <h1 className="m-0 font-gauge text-2xl">Documenti</h1>
    {KINDS.map((k) => (
      <DocCard key={k.kind} bike={bike} {...k} doc={documents.find((d) => d.kind === k.kind)} onChange={onChange} />
    ))}
  </>
)
