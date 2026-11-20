import { useId, useMemo, useRef, useState } from 'react'
import { field } from './ui'

export type Option = { label: string; hint?: string; aliases?: string[] }

const norm = (s: string) => s.toLowerCase().replace(/[\s\-_]/g, '')

// Evidenzia la parte che corrisponde; il nome resta un solo blocco (prototipo: "Kawa|saki" spezzato era un bug)
const Mark = ({ text, q }: { text: string; q: string }) => {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1
  if (i < 0) return <span>{text}</span>
  return (
    <span>
      {text.slice(0, i)}
      <mark className="bg-transparent text-amber">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </span>
  )
}

/** Menu a tendina con ricerca (ARIA combobox + listbox). Si apre al tocco, filtra mentre scrivi,
 *  «Usa …» solo quando nessuna voce corrisponde. Il valore va nel form con `name`. */
export const Combobox = ({ id, name, options, defaultValue = '', placeholder, disabled, required, onPick }: {
  id: string
  name: string
  options: Option[]
  defaultValue?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  onPick?: (value: string) => void
}) => {
  const listId = useId()
  const [value, setValue] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const input = useRef<HTMLInputElement>(null)

  const items = useMemo(() => {
    const q = norm(value)
    const hits = (q ? options.filter((o) => norm(o.label).includes(q) || o.aliases?.some((a) => norm(a).includes(q))) : options).slice(0, 80)
    return hits.length || !value.trim() ? hits : [{ label: value.trim(), free: true as const }]
  }, [value, options])

  const pick = (o: Option) => {
    setValue(o.label)
    setOpen(false)
    onPick?.(o.label)
  }
  const show = open && items.length > 0

  return (
    <div className="relative">
      <input
        ref={input}
        id={id}
        name={name}
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={show && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        enterKeyHint="done"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        onFocus={() => {
          setActive(-1)
          setOpen(true)
        }}
        onChange={(e) => {
          setValue(e.target.value)
          setActive(0)
          setOpen(true)
          onPick?.(e.target.value) // anche il testo libero vale come scelta
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            setOpen(true)
            setActive((a) => Math.min(items.length - 1, a + 1))
            e.preventDefault()
          } else if (e.key === 'ArrowUp') {
            setActive((a) => Math.max(0, a - 1))
            e.preventDefault()
          } else if (e.key === 'Enter' && show && items[active]) {
            pick(items[active])
            e.preventDefault()
          } else if (e.key === 'Escape') setOpen(false)
        }}
        className={`${field} pr-9 disabled:opacity-45`}
      />
      <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-dim">▾</span>
      {show && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+4px)] z-20 m-0 max-h-60 list-none overflow-auto rounded-xl border border-edge bg-[#202733] p-1 shadow-[0_14px_30px_rgb(0_0_0/0.5)]"
        >
          {items.map((o, i) => (
            <li
              key={`${o.label}-${i}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // pointerdown + preventDefault: la scelta avviene prima che il blur chiuda la lista
              onPointerDown={(e) => {
                e.preventDefault()
                pick(o)
              }}
              className={`flex cursor-pointer justify-between gap-2 rounded-lg p-2.5 ${i === active ? 'bg-[#2b3342]' : ''} ${'free' in o ? 'text-amber' : 'text-ink'}`}
            >
              {'free' in o ? <span>Usa «{o.label}»</span> : <Mark text={o.label} q={value.trim()} />}
              {'hint' in o && o.hint && <small className="shrink-0 text-dim">{o.hint}</small>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
