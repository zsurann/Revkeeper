import { m } from 'motion/react'
import { Camera, FileText, Paperclip, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getAttachment, remove, save } from './db'
import type { Id } from './domain/types'
import { prepareAttachment } from './image'
import { ErrorText } from './ui'

type Pending = { name: string; type: string; blob: Blob }

export const AttachmentLink = ({ id, onRemove }: { id: Id; onRemove?: (id: Id) => void }) => {
  const [a, setA] = useState<{ url: string; name: string; type: string }>()
  const [ask, setAsk] = useState(false)
  useEffect(() => {
    let url: string | undefined
    void getAttachment(id).then((x) => x && setA({ url: (url = URL.createObjectURL(x.blob)), name: x.name, type: x.type }))
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [id])
  if (!a) return null
  const Icon = a.type.startsWith('image/') ? Camera : FileText
  const link = (
    <a href={a.url} target="_blank" rel="noreferrer" className={`inline-flex min-w-0 max-w-full items-center gap-2 rounded-full bg-sunken py-1.5 pl-2 text-[13px] font-medium text-ink hover:bg-line ${onRemove ? 'pr-1.5' : 'pr-3'}`}>
      <Icon size={15} className="shrink-0 text-ink-2" /><span className="truncate">{a.name}</span>
    </a>
  )
  if (!onRemove) return link
  // Togliere un allegato chiede conferma: il file sparisce anche dal cloud
  return ask ? (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-red-soft py-1 pl-3 pr-1 text-[13px] font-medium text-red-ink">
      <span className="truncate">Togli {a.name}?</span>
      <button type="button" onClick={() => onRemove(id)} className="h-7 rounded-full bg-red-ink px-3 text-[12px] font-semibold text-white dark:bg-[#B4231A]">Togli</button>
      <button type="button" onClick={() => setAsk(false)} className="grid size-7 place-items-center rounded-full hover:bg-black/10" aria-label="Annulla"><X size={14} /></button>
    </span>
  ) : (
    <span className="inline-flex max-w-full items-center rounded-full bg-sunken">
      {link}
      <button type="button" onClick={() => setAsk(true)} className="grid size-8 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-line" aria-label={`Togli l'allegato ${a.name}`}><X size={14} /></button>
    </span>
  )
}

// Toglie un allegato da un documento o intervento: il record diventa tombstone e il server libera il file su R2
export const withoutAttachment = async (ids: Id[], id: Id) => {
  await remove('attachments', id)
  return ids.filter((x) => x !== id)
}

// Raccoglie i file scelti (già compressi) finché il form non viene salvato
export const usePending = () => {
  const [pending, setPending] = useState<Pending[]>([])
  const [error, setError] = useState('')
  const add = async (files: FileList | null) => {
    for (const f of files ?? []) {
      try {
        const p = await prepareAttachment(f)
        setPending((x) => [...x, p])
        setError('')
      } catch (e) {
        setError(e instanceof RangeError ? e.message : `Non riesco a leggere ${f.name}`)
      }
    }
  }
  const persist = async () => (await Promise.all(pending.map((p) => save('attachments', { ...p, size: p.blob.size })))).map((a) => a.id)
  const drop = (i: number) => setPending((x) => x.filter((_, k) => k !== i))
  return { pending, error, add, persist, drop, clear: () => setPending([]) }
}

export const AttachmentPicker = ({ id, p }: { id: string; p: ReturnType<typeof usePending> }) => (
  <div className="grid gap-2">
    <label htmlFor={id} className="flex h-12 items-center justify-center gap-2 rounded-md border border-dashed border-line-strong text-[14px] font-medium text-ink-2 transition-colors hover:bg-sunken">
      <Paperclip size={16} />Allega foto o PDF <span className="text-ink-3">· max 15 MB</span>
    </label>
    <input id={id} type="file" multiple accept="image/*,application/pdf" className="sr-only" onChange={(e) => void p.add(e.target.files)} />
    {p.pending.length > 0 && (
      <div className="flex flex-wrap gap-2">
        {p.pending.map((f, i) => (
          <m.span key={`${f.name}-${i}`} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-lime-soft py-1 pl-3 pr-1 text-[13px] font-medium text-ink">
            <span className="truncate">{f.name}</span>
            <button type="button" onClick={() => p.drop(i)} className="grid size-6 place-items-center rounded-full hover:bg-black/10" aria-label={`Togli ${f.name}`}><X size={14} /></button>
          </m.span>
        ))}
      </div>
    )}
    {p.error && <ErrorText>{p.error}</ErrorText>}
  </div>
)
