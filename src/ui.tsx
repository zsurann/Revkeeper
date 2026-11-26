import { AnimatePresence, animate, m, useMotionValue, useReducedMotion, type HTMLMotionProps } from 'motion/react'
import { ChevronLeft, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { getAttachment } from './db'
import type { Id, Status } from './domain/types'
import { useBackLayer } from './historyLayers'
import { dur, ease, spring } from './motion'

// Classi dei controlli: un solo posto per forme, colori e stati
const base = 'inline-flex items-center justify-center gap-2 font-semibold select-none disabled:opacity-40 disabled:pointer-events-none transition-[background-color,box-shadow,color,transform] duration-[var(--duration-fast)] active:scale-[0.97] hitbox'
export const btn = {
  primary: `${base} h-12 rounded-full bg-lime px-6 text-[15px] text-black shadow-[inset_0_-2px_0_rgb(0_0_0/0.12),0_6px_20px_-6px_rgb(170_210_0/0.7)] hover:bg-[#C8F52A]`,
  ink: `${base} h-12 rounded-full bg-ink px-6 text-[15px] text-bg hover:opacity-90`,
  secondary: `${base} h-11 rounded-full bg-surface px-5 text-[14px] text-ink shadow-1 ring-1 ring-line hover:ring-line-strong`,
  ghost: `${base} h-10 rounded-full px-4 text-[14px] text-ink-2 hover:bg-sunken`,
  danger: `${base} h-12 rounded-full bg-red-ink px-6 text-[15px] text-white dark:bg-[#B4231A]`,
  icon: `${base} size-10 shrink-0 rounded-full text-ink-2 hover:bg-sunken`,
}
export const primary = btn.primary
export const secondary = btn.secondary
export const ghost = btn.ghost
export const field = 'w-full min-w-0 h-12 rounded-md bg-sunken px-3.5 text-[16px] text-ink placeholder:text-ink-3 ring-1 ring-transparent transition-shadow duration-[var(--duration-fast)] focus:outline-none focus:ring-2 focus:ring-ink focus:bg-surface dark:focus:ring-lime disabled:opacity-50'
export const area = field.replace('h-12', 'min-h-24 py-3')
export const card = 'rounded-lg bg-surface shadow-1 ring-1 ring-line'
export const link = 'hitbox inline-flex items-center gap-1 text-[13px] font-semibold text-ink-2 hover:text-ink'

export const Card = ({ className = '', children, ...p }: { className?: string; children: ReactNode } & HTMLMotionProps<'div'>) => (
  <m.div className={`${card} ${className}`} {...p}>{children}</m.div>
)

// Contenitore delle pagine: entra con una dissolvenza breve dal basso
export const Screen = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  // Niente animazione propria: entra già con la transizione di pagina (due animazioni insieme davano un movimento storto)
  <main className={`mx-auto grid w-full max-w-[480px] grid-cols-1 content-start gap-6 px-4 pb-32 pt-[max(20px,env(safe-area-inset-top))] lg:max-w-[760px] lg:px-8 lg:pb-16 lg:pt-10 ${className}`}>
    {children}
  </main>
)

// Titolo di pagina con indietro facoltativo e un'azione a destra
export const PageHead = ({ title, sub, onBack, action }: { title: string; sub?: ReactNode; onBack?: () => void; action?: ReactNode }) => (
  <header className="grid gap-1">
    {onBack && (
      <button type="button" onClick={onBack} className="hitbox -ml-2 mb-1 inline-flex h-10 items-center gap-1 justify-self-start rounded-full pl-1 pr-3 text-[14px] font-semibold text-ink-2 hover:bg-sunken">
        <ChevronLeft size={20} />Indietro
      </button>
    )}
    <div className="flex items-center justify-between gap-3">
      <h1 className="t-display m-0 min-w-0 text-[28px] lg:text-[34px]">{title}</h1>
      {action}
    </div>
    {sub && <p className="m-0 text-[14px] text-ink-3">{sub}</p>}
  </header>
)

export const SectionTitle = ({ children, action, id }: { children: ReactNode; action?: ReactNode; id?: string }) => (
  <div className="flex items-end justify-between gap-3 px-1">
    <h2 id={id} className="t-title m-0 text-[17px]">{children}</h2>
    {action}
  </div>
)

export const Field = ({ label, children, hint, className = '' }: { label: string; children: ReactNode; hint?: string; className?: string }) => (
  <label className={`grid min-w-0 content-start gap-1.5 text-[13px] font-medium text-ink-2 ${className}`}>
    {label}
    {children}
    {hint && <span className="text-[12px] font-normal text-ink-3">{hint}</span>}
  </label>
)

export const ErrorText = ({ children }: { children: ReactNode }) => (
  <m.p role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="m-0 text-[14px] font-medium text-red-ink">{children}</m.p>
)

const pill: Record<Status, string> = { ok: 'bg-sunken text-ink-2', warn: 'bg-amber-soft text-amber-ink', overdue: 'bg-red-soft text-red-ink' }
export const statusLabel: Record<Status, string> = { ok: 'In regola', warn: 'In scadenza', overdue: 'Scaduta' }
export const StatusPill = ({ status, children }: { status: Status; children?: ReactNode }) => (
  <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold leading-none ${pill[status]}`}>
    <i aria-hidden="true" className={`size-1.5 rounded-full ${status === 'ok' ? 'bg-lime-ink' : status === 'warn' ? 'bg-amber' : 'bg-red'}`} />
    {children ?? statusLabel[status]}
  </span>
)

// Barra sottile a segmenti per le righe degli elenchi (stessa grammatica del contagiri del cruscotto)
export const MiniBar = ({ progress, status, segments = 24 }: { progress: number; status: Status; segments?: number }) => {
  const lit = Math.max(progress > 0 ? 1 : 0, Math.round(Math.min(1, progress) * segments))
  const on = status === 'overdue' ? 'var(--color-red)' : status === 'warn' ? 'var(--color-amber)' : 'var(--color-ink)'
  // Un solo elemento: colore fino al segmento acceso, poi una maschera ritaglia i segmenti (prima erano 24 elementi per riga)
  const step = `((100% + 2px) / ${segments})`
  const edge = `calc(${lit} * ${step})`
  return (
    <span
      aria-hidden="true"
      className="block h-1.5 w-full origin-left animate-[bar_var(--duration-slow)_var(--ease-out)_150ms_both]"
      style={{
        background: `linear-gradient(90deg, ${on} ${edge}, var(--color-line) ${edge})`,
        maskImage: `repeating-linear-gradient(90deg, #000 0 calc(${step} - 2px), transparent 0 calc(${step}))`,
      }}
    />
  )
}

// Scelta a pillole (es. tema): l'indicatore lime scivola sotto la voce scelta
export function Segmented<T extends string>({ value, options, onChange, label, id }: { value: T; options: { value: T; label: string; icon?: ReactNode }[]; onChange: (v: T) => void; label: string; id: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-full bg-sunken p-1">
      {options.map((o) => {
        const on = o.value === value
        return (
          <button key={o.value} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.value)}
            className={`hitbox flex h-10 items-center justify-center gap-1.5 rounded-full text-[14px] font-semibold transition-colors ${on ? 'text-black' : 'text-ink-2 hover:text-ink'}`}>
            {on && <m.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-full bg-lime shadow-[0_2px_8px_-2px_rgb(120_150_0/0.5)]" transition={spring.snappy} />}
            <span className="relative flex items-center gap-1.5">{o.icon}{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// Foglio dal basso (su schermi larghi una finestra al centro): si trascina giù da maniglia, titolo o contenuto (quando è in cima); Esc e Indietro chiudono
const canDragFromTarget = (target: EventTarget | null, body: HTMLElement | null): boolean => {
  if (!body || body.scrollTop > 1) return false
  let el = target as HTMLElement | null
  while (el && el !== body) {
    if (el.tagName === 'SELECT' || (el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'range')) return false
    const style = getComputedStyle(el)
    if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollTop > 1) return false
    el = el.parentElement
  }
  return true
}

export const Sheet = ({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) => {
  const reduce = useReducedMotion()
  const panel = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const dragY = useMotionValue(0)
  const touchActiveRef = useRef(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useBackLayer(open, onClose, 'overlay')

  useEffect(() => {
    if (open) dragY.set(0)
  }, [open, dragY])

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current()
    addEventListener('keydown', key)
    const t = setTimeout(() => panel.current?.querySelector<HTMLElement>('input,select,textarea,button:not([data-close])')?.focus(), 260)
    document.documentElement.style.overflow = 'hidden'
    return () => {
      removeEventListener('keydown', key)
      clearTimeout(t)
      document.documentElement.style.overflow = ''
      prev?.focus?.()
    }
  }, [open])

  // Trascinamento sul corpo del foglio via TouchEvent nativo (evita pull-to-refresh e scroll-chaining quando è in cima)
  useEffect(() => {
    const body = bodyRef.current
    if (!open || !body) return
    let s: { x: number; y: number; originY: number; lastY: number; lastT: number; vy: number; dy: number; dragging: boolean; decided: boolean } | null = null
    let touchTimer: number | undefined

    const onTouchStart = (e: TouchEvent) => {
      if (touchTimer) { window.clearTimeout(touchTimer); touchTimer = undefined }
      touchActiveRef.current = true
      if (e.touches.length !== 1 || !canDragFromTarget(e.target, body)) { s = null; return }
      const t = e.touches[0]!
      s = { x: t.clientX, y: t.clientY, originY: t.clientY, lastY: t.clientY, lastT: performance.now(), vy: 0, dy: 0, dragging: false, decided: false }
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!s || e.touches.length !== 1) return
      const t = e.touches[0]!
      const now = performance.now()
      if (!s.decided) {
        const dx = t.clientX - s.x
        const dy = t.clientY - s.y
        if (Math.hypot(dx, dy) < 6) return
        s.decided = true
        if (dy > 0 && Math.abs(dy) > Math.abs(dx) * 1.1 && canDragFromTarget(e.target, body)) {
          s.dragging = true
          s.originY = t.clientY
          s.lastY = t.clientY
          s.lastT = now
        } else {
          s = null
          return
        }
      }
      if (!s.dragging) return
      if (e.cancelable) e.preventDefault()
      const dy = t.clientY - s.originY
      const dt = Math.max(1, now - s.lastT)
      const instantVy = ((t.clientY - s.lastY) / dt) * 1000
      s.vy = s.vy * 0.5 + instantVy * 0.5
      s.dy = dy
      s.lastY = t.clientY
      s.lastT = now
      if (!reduce) dragY.set(dy < 0 ? dy * 0.08 : dy)
    }
    const onTouchEnd = (e: TouchEvent) => {
      const cur = s
      s = null
      touchTimer = window.setTimeout(() => { touchActiveRef.current = false }, 80)
      if (!cur?.dragging) return
      const shouldClose = e.type === 'touchend' && (reduce ? cur.dy > 80 || cur.vy > 600 : cur.dy > 110 || cur.vy > 600)
      if (shouldClose) {
        if (reduce) dragY.set(0)
        onCloseRef.current()
      } else if (!reduce) {
        void animate(dragY, 0, spring.sheet)
      }
    }

    body.addEventListener('touchstart', onTouchStart, { passive: true })
    body.addEventListener('touchmove', onTouchMove, { passive: false })
    body.addEventListener('touchend', onTouchEnd)
    body.addEventListener('touchcancel', onTouchEnd)
    return () => {
      if (touchTimer) window.clearTimeout(touchTimer)
      touchActiveRef.current = false
      body.removeEventListener('touchstart', onTouchStart)
      body.removeEventListener('touchmove', onTouchMove)
      body.removeEventListener('touchend', onTouchEnd)
      body.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [open, reduce, dragY])

  const startPointerDrag = (startEvent: React.PointerEvent, immediate: boolean) => {
    if (!immediate && touchActiveRef.current) return
    if (!startEvent.isPrimary || startEvent.button !== 0) return
    if (!immediate && !canDragFromTarget(startEvent.target, bodyRef.current)) return
    let s = {
      id: startEvent.pointerId,
      x: startEvent.clientX,
      y: startEvent.clientY,
      originY: startEvent.clientY,
      lastY: startEvent.clientY,
      lastT: performance.now(),
      vy: 0,
      dy: 0,
      dragging: immediate,
      decided: immediate,
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== s.id) return
      const now = performance.now()
      if (!s.decided) {
        const dx = e.clientX - s.x
        const dy = e.clientY - s.y
        if (Math.hypot(dx, dy) < 6) return
        s.decided = true
        if (dy > 0 && Math.abs(dy) > Math.abs(dx) * 1.1 && canDragFromTarget(e.target, bodyRef.current)) {
          s.dragging = true
          s.originY = e.clientY
          s.lastY = e.clientY
          s.lastT = now
        } else {
          cleanup()
          return
        }
      }
      if (!s.dragging) return
      const dy = e.clientY - s.originY
      const dt = Math.max(1, now - s.lastT)
      const instantVy = ((e.clientY - s.lastY) / dt) * 1000
      s.vy = s.vy * 0.5 + instantVy * 0.5
      s.dy = dy
      s.lastY = e.clientY
      s.lastT = now
      if (!reduce) dragY.set(dy < 0 ? dy * 0.08 : dy)
    }
    const onEnd = (e: PointerEvent) => {
      if (e.pointerId !== s.id) return
      cleanup()
      if (!s.dragging) return
      const shouldClose = e.type === 'pointerup' && (reduce ? s.dy > 80 || s.vy > 600 : s.dy > 110 || s.vy > 600)
      if (shouldClose) {
        if (reduce) dragY.set(0)
        onCloseRef.current()
      } else if (!reduce) {
        void animate(dragY, 0, spring.sheet)
      }
    }
    const cleanup = () => {
      removeEventListener('pointermove', onMove)
      removeEventListener('pointerup', onEnd)
      removeEventListener('pointercancel', onEnd)
    }
    addEventListener('pointermove', onMove)
    addEventListener('pointerup', onEnd)
    addEventListener('pointercancel', onEnd)
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40 grid items-end lg:place-items-center" role="dialog" aria-modal="true" aria-label={title}>
          <m.div className="absolute inset-0 bg-[#0E1116]/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2, ease: ease.inOut } }} transition={{ duration: dur.base }} onClick={onClose} />
          <m.div
            className="relative mx-auto flex w-full max-w-[520px] justify-center"
            initial={reduce ? { opacity: 0 } : { y: '100%' }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: '100%', transition: { duration: 0.2, ease: ease.inOut } }}
            transition={spring.sheet}
          >
            <m.div
              ref={panel}
              className="flex max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-12px))] w-full flex-col rounded-t-xl bg-surface shadow-3 lg:rounded-xl"
              style={{ y: reduce ? 0 : dragY }}
            >
              {/* Maniglia, titolo e contenuto (quando è in cima) chiudono trascinando verso il basso */}
              <div onPointerDown={(e) => startPointerDrag(e, true)} className="grid cursor-grab touch-none place-items-center pb-1 pt-2.5 active:cursor-grabbing" aria-hidden="true">
                <i className="h-1.5 w-10 rounded-full bg-line-strong" />
              </div>
              <div className="flex items-center justify-between px-5 pb-2 pt-1">
                <h2 className="t-title m-0 flex-1 cursor-grab touch-none text-[20px] active:cursor-grabbing" onPointerDown={(e) => startPointerDrag(e, true)}>{title}</h2>
                <button type="button" data-close onClick={onClose} className={btn.icon} aria-label="Chiudi"><X size={20} /></button>
              </div>
              <div
                ref={bodyRef}
                onPointerDown={(e) => startPointerDrag(e, false)}
                className="overflow-y-auto overscroll-contain px-5 pb-[max(20px,env(safe-area-inset-bottom))]"
                style={{ touchAction: 'pan-y' }}
              >{children}</div>
            </m.div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  )
}
// Festeggiamento al salvataggio: spunta che si disegna, anello che si espande e segmenti che schizzano via
export const Celebrate = ({ size = 96 }: { size?: number }) => {
  const reduce = useReducedMotion()
  return (
    <div className="relative grid place-items-center" style={{ width: size * 2, height: size * 1.7 }} aria-hidden="true">
      {!reduce && Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2, d = size * (0.85 + (i % 3) * 0.12)
        return (
          <m.i key={i} className={`absolute block h-[5px] w-4 rounded-full ${i % 4 === 0 ? 'bg-ink' : 'bg-lime'}`} style={{ rotate: `${(a * 180) / Math.PI}deg` }}
            initial={{ x: 0, y: 0, opacity: 0, scaleX: 0.4 }}
            animate={{ x: Math.cos(a) * d, y: Math.sin(a) * d, opacity: [0, 1, 0], scaleX: [0.4, 1.2, 0.6] }}
            transition={{ duration: 0.9, delay: 0.32, ease: ease.out }} />
        )
      })}
      <m.span className="absolute rounded-full border-2 border-lime" style={{ width: size, height: size }} initial={{ scale: 0.6, opacity: 0 }} animate={reduce ? { opacity: 0 } : { scale: [0.6, 1.7], opacity: [0.9, 0] }} transition={{ duration: 0.8, delay: 0.25, ease: ease.out }} />
      <m.span className="relative grid place-items-center rounded-full bg-lime shadow-[0_18px_50px_-12px_rgb(170_210_0/0.9)]" style={{ width: size, height: size }} initial={reduce ? false : { scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 18 }}>
        <svg width={size * 0.46} height={size * 0.46} viewBox="0 0 24 24" fill="none" stroke="#0E1116" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <m.path d="M4.5 12.5l5 5L19.5 7" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, delay: 0.2, ease: ease.out }} />
        </svg>
      </m.span>
    </div>
  )
}

export const Skeleton = ({ className = '' }: { className?: string }) => <div className={`skeleton ${className}`} />

// Stato vuoto: icona in un tondo, titolo, testo e un'azione
export const Empty = ({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) => (
  <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: dur.slow, ease: ease.out }} className={`${card} grid justify-items-center gap-3 px-6 py-10 text-center`}>
    <span className="grid size-16 place-items-center rounded-full bg-lime-soft text-lime-ink">{icon}</span>
    <h2 className="t-title m-0 text-[19px]">{title}</h2>
    <p className="m-0 max-w-[30ch] text-[14px] text-ink-3">{text}</p>
    {action && <div className="mt-2">{action}</div>}
  </m.div>
)

// Object URL della foto salvata in IndexedDB, revocato quando cambia o si smonta
export const usePhoto = (id?: Id) => {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    let u: string | undefined
    let live = true
    if (id) void getAttachment(id).then((a) => a?.blob && live && setUrl((u = URL.createObjectURL(a.blob))))
    else setUrl(undefined)
    return () => {
      live = false
      if (u) URL.revokeObjectURL(u)
    }
  }, [id])
  return url
}
