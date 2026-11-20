import { useEffect, useState } from 'react'
import { getAttachment, save } from './db'
import type { Id } from './domain/types'
import { prepareAttachment } from './image'

type Pending = { name: string; type: string; blob: Blob }

export const AttachmentLink = ({ id }: { id: Id }) => {
  const [a, setA] = useState<{ url: string; name: string }>()
  useEffect(() => {
    let url: string | undefined
    void getAttachment(id).then((x) => x && setA({ url: (url = URL.createObjectURL(x.blob)), name: x.name }))
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [id])
  return a ? <a href={a.url} target="_blank" rel="noreferrer" className="text-sm text-amber underline">{a.name}</a> : null
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
  const persist = async () => (await Promise.all(pending.map((p) => save('attachments', p)))).map((a) => a.id)
  return { pending, error, add, persist, clear: () => setPending([]) }
}

export const AttachmentPicker = ({ id, p }: { id: string; p: ReturnType<typeof usePending> }) => (
  <div className="grid gap-2">
    <label htmlFor={id} className="cursor-pointer rounded-lg border border-dashed border-edge px-3 py-2.5 text-sm text-dim">
      + Allega foto o PDF (max 15 MB)
    </label>
    <input id={id} type="file" multiple accept="image/*,application/pdf" className="sr-only" onChange={(e) => void p.add(e.target.files)} />
    {p.pending.map((f, i) => <span key={i} className="text-sm text-ink">{f.name}</span>)}
    {p.error && <p role="alert" className="m-0 text-sm text-red">{p.error}</p>}
  </div>
)
