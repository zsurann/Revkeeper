import { useEffect, useId, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ChevronDown } from 'lucide-react'
import { useBackLayer } from './historyLayers'
import { field } from './ui'

export type Option = { label: string; hint?: string; aliases?: string[] }

const norm = (s: string) => s.toLowerCase().replace(/[\s\-_]/g, '')
const TAP = 8 // oltre 8 px è uno scorrimento, non una scelta

// Evidenzia la parte che corrisponde; il nome resta un solo blocco (prototipo: "Kawa|saki" spezzato era un bug)
const Mark = ({ text, q }: { text: string; q: string }) => {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1
  if (i < 0) return <span>{text}</span>
  return (
    <span>
      {text.slice(0, i)}
      <mark className="bg-transparent font-semibold text-lime-ink">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </span>
  )
}

/** Menu a tendina con ricerca (ARIA combobox + listbox). Si apre al tocco, filtra mentre scrivi,
 *  «Usa …» solo quando nessuna voce corrisponde. Il valore va nel form con `name`.
 *  La lista si scorre con il dito e con la rotella: la scelta avviene al tocco fermo, non all'inizio del gesto. */
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
  const root = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number>(undefined)
  const gesture = useRef<{ x: number; y: number; moved: boolean } | null>(null)
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
  useBackLayer(show, () => { setOpen(false); input.current?.blur() }, 'overlay')

  const cancelClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    closeTimer.current = undefined
  }
  useEffect(() => () => cancelClose(), [])

  // Un tocco fuori chiude; durante lo scorrimento l'input può perdere il focus e non deve chiudere la lista
  useEffect(() => {
    if (!show) return
    const onDown = (e: PointerEvent) => {
      if (root.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [show])

  const onListPointerDown = (e: ReactPointerEvent) => {
    cancelClose()
    // Col mouse, evita che l'input perda il focus. Sul tocco preventDefault bloccherebbe lo scorrimento.
    if (e.pointerType !== 'touch') e.preventDefault()
    gesture.current = { x: e.clientX, y: e.clientY, moved: false }
  }
  const onListPointerMove = (e: ReactPointerEvent) => {
    const g = gesture.current
    if (g && Math.hypot(e.clientX - g.x, e.clientY - g.y) > TAP) g.moved = true
  }
  const onListPointerUp = (e: ReactPointerEvent) => {
    const g = gesture.current
    gesture.current = null
    if (!g || g.moved) return
    const li = (e.target as HTMLElement).closest('[role="option"]')
    if (!li) return
    const i = Number(li.getAttribute('data-index'))
    const item = items[i]
    if (item) pick(item)
  }

  return (
    <div ref={root} className="relative">
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
          cancelClose()
          setActive(-1)
          setOpen(true)
        }}
        onChange={(e) => {
          setValue(e.target.value)
          setActive(0)
          setOpen(true)
          onPick?.(e.target.value) // anche il testo libero vale come scelta
        }}
        onBlur={() => {
          closeTimer.current = window.setTimeout(() => {
            if (!gesture.current) setOpen(false)
          }, 200)
        }}
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
      <ChevronDown size={18} aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
      {show && (
        <ul
          id={listId}
          role="listbox"
          onPointerDown={onListPointerDown}
          onPointerMove={onListPointerMove}
          onPointerUp={onListPointerUp}
          onPointerCancel={() => { gesture.current = null }}
          className="absolute inset-x-0 top-[calc(100%+4px)] z-20 m-0 max-h-60 list-none overflow-auto overscroll-contain touch-pan-y rounded-md bg-surface p-1 shadow-3 ring-1 ring-line"
        >
          {items.map((o, i) => (
            <li
              key={`${o.label}-${i}`}
              id={`${listId}-${i}`}
              data-index={i}
              role="option"
              aria-selected={i === active}
              className={`flex cursor-pointer select-none justify-between gap-2 rounded-lg p-2.5 ${i === active ? 'bg-sunken' : ''} ${'free' in o ? 'font-semibold text-lime-ink' : 'text-ink'}`}
            >
              {'free' in o ? <span>Usa «{o.label}»</span> : <Mark text={o.label} q={value.trim()} />}
              {'hint' in o && o.hint && <small className="shrink-0 text-ink-3">{o.hint}</small>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
