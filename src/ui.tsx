import { AnimatePresence, motion, useDragControls, useReducedMotion, type HTMLMotionProps } from 'motion/react'
import { ChevronLeft, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { getAttachment } from './db'
import type { Id, Status } from './domain/types'
import { dur, ease, spring } from './motion'

// Classi dei controlli: un solo posto per forme, colori e stati
const base = 'inline-flex items-center justify-center gap-2 font-semibold select-none disabled:opacity-40 disabled:pointer-events-none transition-[background-color,box-shadow,color,transform] duration-[var(--duration-fast)] active:scale-[0.97]'
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
export const link = 'inline-flex items-center gap-1 text-[13px] font-semibold text-ink-2 hover:text-ink'

export const Card = ({ className = '', children, ...p }: { className?: string; children: ReactNode } & HTMLMotionProps<'div'>) => (
  <motion.div className={`${card} ${className}`} {...p}>{children}</motion.div>
)

// Contenitore delle pagine: entra con una dissolvenza breve dal basso
export const Screen = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <motion.main
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: dur.slow, ease: ease.out }}
    className={`mx-auto grid w-full max-w-[480px] content-start gap-6 px-4 pb-32 pt-[max(20px,env(safe-area-inset-top))] lg:max-w-[760px] lg:px-8 lg:pb-16 lg:pt-10 ${className}`}
  >
    {children}
  </motion.main>
)

// Titolo di pagina con indietro facoltativo e un'azione a destra
export const PageHead = ({ title, sub, onBack, action }: { title: string; sub?: ReactNode; onBack?: () => void; action?: ReactNode }) => (
  <header className="grid gap-1">
    {onBack && (
      <button type="button" onClick={onBack} className="-ml-2 mb-1 inline-flex h-10 items-center gap-1 justify-self-start rounded-full pl-1 pr-3 text-[14px] font-semibold text-ink-2 hover:bg-sunken">
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

export const Field = ({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) => (
  <label className="grid content-start gap-1.5 text-[13px] font-medium text-ink-2">
    {label}
    {children}
    {hint && <span className="text-[12px] font-normal text-ink-3">{hint}</span>}
  </label>
)

export const ErrorText = ({ children }: { children: ReactNode }) => (
  <motion.p role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="m-0 text-[14px] font-medium text-red-ink">{children}</motion.p>
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
  const on = status === 'overdue' ? 'bg-red' : status === 'warn' ? 'bg-amber' : 'bg-ink'
  return (
    <span className="grid h-1.5 w-full gap-[2px]" style={{ gridTemplateColumns: `repeat(${segments},1fr)` }} aria-hidden="true">
      {Array.from({ length: segments }, (_, i) => (
        <motion.i
          key={i}
          className={`block rounded-[1px] ${i < lit ? on : 'bg-line'}`}
          initial={{ scaleY: 0.2, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          transition={{ delay: 0.15 + i * 0.02, duration: dur.base, ease: ease.out }}
        />
      ))}
    </span>
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
            className={`relative flex h-10 items-center justify-center gap-1.5 rounded-full text-[14px] font-semibold transition-colors ${on ? 'text-black' : 'text-ink-2 hover:text-ink'}`}>
            {on && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-full bg-lime shadow-[0_2px_8px_-2px_rgb(120_150_0/0.5)]" transition={spring.snappy} />}
            <span className="relative flex items-center gap-1.5">{o.icon}{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// Foglio dal basso (su schermi larghi una finestra al centro): si trascina giù per chiudere, Esc chiude
export const Sheet = ({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) => {
  const reduce = useReducedMotion()
  const panel = useRef<HTMLDivElement>(null)
  const drag = useDragControls()
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', key)
    const t = setTimeout(() => panel.current?.querySelector<HTMLElement>('input,select,textarea,button:not([data-close])')?.focus(), 260)
    document.documentElement.style.overflow = 'hidden'
    return () => {
      removeEventListener('keydown', key)
      clearTimeout(t)
      document.documentElement.style.overflow = ''
      prev?.focus?.()
    }
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40 grid items-end lg:place-items-center" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div className="absolute inset-0 bg-[#0E1116]/45 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: dur.base }} onClick={onClose} />
          <motion.div
            ref={panel}
            className="relative mx-auto flex max-h-[92dvh] w-full max-w-[520px] flex-col rounded-t-xl bg-surface shadow-3 lg:rounded-xl"
            initial={reduce ? { opacity: 0 } : { y: '100%' }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: '100%', transition: { duration: 0.2, ease: ease.inOut } }}
            transition={spring.sheet}
            drag={reduce ? false : 'y'}
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.6 }}
            onDragEnd={(_, i) => { if (i.offset.y > 110 || i.velocity.y > 600) onClose() }}
          >
            {/* la maniglia avvia il trascinamento; il resto del foglio scorre normalmente */}
            <div onPointerDown={(e) => drag.start(e)} className="grid cursor-grab touch-none place-items-center pb-1 pt-2.5 active:cursor-grabbing" aria-hidden="true">
              <i className="h-1.5 w-10 rounded-full bg-line-strong" />
            </div>
            <div className="flex items-center justify-between px-5 pb-2 pt-1">
              <h2 className="t-title m-0 text-[20px]">{title}</h2>
              <button type="button" data-close onClick={onClose} className={btn.icon} aria-label="Chiudi"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto overscroll-contain px-5 pb-[max(20px,env(safe-area-inset-bottom))]">{children}</div>
          </motion.div>
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
          <motion.i key={i} className={`absolute block h-[5px] w-4 rounded-full ${i % 4 === 0 ? 'bg-ink' : 'bg-lime'}`} style={{ rotate: `${(a * 180) / Math.PI}deg` }}
            initial={{ x: 0, y: 0, opacity: 0, scaleX: 0.4 }}
            animate={{ x: Math.cos(a) * d, y: Math.sin(a) * d, opacity: [0, 1, 0], scaleX: [0.4, 1.2, 0.6] }}
            transition={{ duration: 0.9, delay: 0.32, ease: ease.out }} />
        )
      })}
      <motion.span className="absolute rounded-full border-2 border-lime" style={{ width: size, height: size }} initial={{ scale: 0.6, opacity: 0 }} animate={reduce ? { opacity: 0 } : { scale: [0.6, 1.7], opacity: [0.9, 0] }} transition={{ duration: 0.8, delay: 0.25, ease: ease.out }} />
      <motion.span className="relative grid place-items-center rounded-full bg-lime shadow-[0_18px_50px_-12px_rgb(170_210_0/0.9)]" style={{ width: size, height: size }} initial={reduce ? false : { scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 18 }}>
        <svg width={size * 0.46} height={size * 0.46} viewBox="0 0 24 24" fill="none" stroke="#0E1116" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <motion.path d="M4.5 12.5l5 5L19.5 7" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, delay: 0.2, ease: ease.out }} />
        </svg>
      </motion.span>
    </div>
  )
}

export const Skeleton = ({ className = '' }: { className?: string }) => <div className={`skeleton ${className}`} />

// Stato vuoto: icona in un tondo, titolo, testo e un'azione
export const Empty = ({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) => (
  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: dur.slow, ease: ease.out }} className={`${card} grid justify-items-center gap-3 px-6 py-10 text-center`}>
    <span className="grid size-16 place-items-center rounded-full bg-lime-soft text-lime-ink">{icon}</span>
    <h2 className="t-title m-0 text-[19px]">{title}</h2>
    <p className="m-0 max-w-[30ch] text-[14px] text-ink-3">{text}</p>
    {action && <div className="mt-2">{action}</div>}
  </motion.div>
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
