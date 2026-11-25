import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ChevronDown } from 'lucide-react'
import { useBackLayer } from './historyLayers'
import { field } from './ui'

export type Option = { label: string; hint?: string; aliases?: string[] }

const norm = (s: string) => s.toLowerCase().replace(/[\s\-_]/g, '')
const TAP = 8 // oltre 8 px è uno scorrimento, non una scelta
const coarsePointer = () => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches

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

/** Menu a tendina con ricerca (ARIA combobox + listbox).
 *  Su tocco: al primo tocco apre la lista completa senza tastiera; al secondo tocco sul campo apre la tastiera per filtrare.
 *  Su desktop: apre e permette subito di scrivere. Il valore va nel form con `name`.
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
  const listRef = useRef<HTMLUListElement>(null)
  const closeTimer = useRef<number>(undefined)
  const gesture = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const wasOpenOnDown = useRef(false)
  const lastTouchInRoot = useRef(0)
  const coarse = coarsePointer()

  const [value, setValue] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const [edited, setEdited] = useState(false)
  const [typing, setTyping] = useState(!coarse)
  const [active, setActive] = useState(-1)
  const [layout, setLayout] = useState<{ above: boolean; maxH: number }>({ above: false, maxH: 360 })
  const input = useRef<HTMLInputElement>(null)

  const items = useMemo(() => {
    const q = edited ? norm(value) : ''
    const hits = q
      ? options.filter((o) => norm(o.label).includes(q) || o.aliases?.some((a) => norm(a).includes(q))).slice(0, 120)
      : options
    return hits.length || !edited || !value.trim() ? hits : [{ label: value.trim(), free: true as const }]
  }, [value, options, edited])

  const close = () => {
    setOpen(false)
    setEdited(false)
    if (coarsePointer()) setTyping(false)
  }

  const pick = (o: Option) => {
    setValue(o.label)
    close()
    if (coarsePointer()) input.current?.blur()
    onPick?.(o.label)
  }

  const show = open && items.length > 0
  useBackLayer(show, () => { close(); input.current?.blur() }, 'overlay')

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
      close()
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [show])

  // Spazio disponibile sopra/sotto rispetto al visualViewport (resta visibile anche quando si apre la tastiera)
  useLayoutEffect(() => {
    if (!show) return
    const measure = () => {
      const rect = root.current?.getBoundingClientRect()
      if (!rect) return
      const vv = window.visualViewport
      const vpTop = vv ? vv.offsetTop : 0
      const vpHeight = vv ? vv.height : window.innerHeight
      const vpBottom = vpTop + vpHeight
      const below = vpBottom - rect.bottom - 12
      const aboveSpace = rect.top - vpTop - 12
      const flip = below < 160 && aboveSpace > below
      const avail = flip ? aboveSpace : below
      const kbOpen = !!vv && vv.height < window.innerHeight * 0.85
      const maxH = kbOpen ? avail : Math.min(avail, 420)
      setLayout({ above: flip, maxH: Math.max(120, Math.floor(maxH)) })
    }
    measure()
    const vv = window.visualViewport
    vv?.addEventListener('resize', measure)
    vv?.addEventListener('scroll', measure)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, { passive: true })
    return () => {
      vv?.removeEventListener('resize', measure)
      vv?.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure)
    }
  }, [show, typing])

  // Quando la lista si apre senza filtro su un valore già scelto, scorre fino alla voce corrente
  useEffect(() => {
    if (!show || edited || !value) return
    const idx = items.findIndex((o) => !('free' in o) && norm(o.label) === norm(value))
    if (idx > 0) {
      const el = listRef.current?.querySelector(`[data-index="${idx}"]`) as HTMLElement | null
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [show]) // eslint-disable-line react-hooks/exhaustive-deps

  const onListPointerDown = (e: ReactPointerEvent) => {
    cancelClose()
    if (e.pointerType === 'touch' || e.pointerType === 'pen') lastTouchInRoot.current = Date.now()
    // Col mouse, evita che l'input perda il focus. Sul tocco preventDefault bloccherebbe lo scorrimento.
    if (e.pointerType !== 'touch') e.preventDefault()
    gesture.current = { x: e.clientX, y: e.clientY, moved: false }
  }
  const onListPointerMove = (e: ReactPointerEvent) => {
    if (e.pointerType === 'touch' || e.pointerType === 'pen') lastTouchInRoot.current = Date.now()
    const g = gesture.current
    if (g && Math.hypot(e.clientX - g.x, e.clientY - g.y) > TAP) g.moved = true
  }
  const onListPointerUp = (e: ReactPointerEvent) => {
    if (e.pointerType === 'touch' || e.pointerType === 'pen') lastTouchInRoot.current = Date.now()
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
        readOnly={!typing}
        inputMode={typing ? undefined : 'none'}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        onPointerDown={(e) => {
          cancelClose()
          wasOpenOnDown.current = open
          if (e.pointerType === 'touch' || e.pointerType === 'pen') {
            lastTouchInRoot.current = Date.now()
            if (!open) {
              setTyping(false)
              e.currentTarget.readOnly = true
              e.currentTarget.inputMode = 'none'
            }
          } else {
            setTyping(true)
            e.currentTarget.readOnly = false
            e.currentTarget.removeAttribute('inputmode')
          }
        }}
        onFocus={() => {
          cancelClose()
          setActive(-1)
          setEdited(false)
          setOpen(true)
        }}
        onClick={(e) => {
          if (!wasOpenOnDown.current) {
            setOpen(true)
            return
          }
          if (!typing) {
            setTyping(true)
            const el = e.currentTarget
            el.readOnly = false
            el.removeAttribute('inputmode')
            el.focus()
            const len = el.value.length
            try { el.setSelectionRange(len, len) } catch { /* input non selezionabile */ }
            requestAnimationFrame(() => el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
          }
        }}
        onChange={(e) => {
          setEdited(true)
          setValue(e.target.value)
          setActive(0)
          setOpen(true)
          onPick?.(e.target.value) // anche il testo libero vale come scelta
        }}
        onBlur={(e) => {
          const next = e.relatedTarget as Node | null
          if (next && root.current?.contains(next)) return
          if (next && !root.current?.contains(next)) {
            close()
            return
          }
          closeTimer.current = window.setTimeout(() => {
            if (gesture.current || Date.now() - lastTouchInRoot.current < 450) return
            close()
          }, 150)
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
          } else if (e.key === 'Escape') {
            close()
          } else if (!typing && (e.key.length === 1 || e.key === 'Backspace')) {
            setTyping(true)
            e.currentTarget.readOnly = false
            e.currentTarget.removeAttribute('inputmode')
          }
        }}
        className={`${field} pr-9 disabled:opacity-45 ${!typing ? 'caret-transparent cursor-pointer' : ''}`}
      />
      <ChevronDown size={18} aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
      {show && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          onPointerDown={onListPointerDown}
          onPointerMove={onListPointerMove}
          onPointerUp={onListPointerUp}
          onPointerCancel={() => { gesture.current = null }}
          style={{ maxHeight: layout.maxH }}
          className={`absolute inset-x-0 ${layout.above ? 'bottom-[calc(100%+4px)]' : 'top-[calc(100%+4px)]'} z-20 m-0 list-none overflow-auto overscroll-contain touch-pan-y rounded-md bg-surface p-1 shadow-3 ring-1 ring-line`}
        >
          {items.map((o, i) => {
            const selected = !edited && !('free' in o) && !!value && norm(o.label) === norm(value)
            return (
              <li
                key={`${o.label}-${i}`}
                id={`${listId}-${i}`}
                data-index={i}
                role="option"
                aria-selected={i === active || selected}
                className={`flex cursor-pointer select-none justify-between gap-2 rounded-lg p-2.5 ${i === active ? 'bg-sunken' : selected ? 'bg-lime-soft/60 font-medium' : ''} ${'free' in o ? 'font-semibold text-lime-ink' : 'text-ink'}`}
              >
                {'free' in o ? <span>Usa «{o.label}»</span> : <Mark text={o.label} q={edited ? value.trim() : ''} />}
                {'hint' in o && o.hint && <small className="shrink-0 text-ink-3">{o.hint}</small>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
