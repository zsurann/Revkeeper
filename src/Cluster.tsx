import { animate, m, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import type { Status } from './domain/types'
import { int } from './domain/num'
import { ease } from './motion'

const N = 28
const REDLINE = 0.86 // ultimi segmenti: zona rossa, come le luci di cambiata

// Barra a segmenti (shift-light): quanta parte dell'intervallo è già consumata.
// All'apertura fa il "self-test" dell'accensione: si accende tutta e ricade sul valore. Scaduta: lampeggia.
export const RevBar = ({ progress, status, sweep = true }: { progress: number; status: Status; sweep?: boolean }) => {
  const reduce = useReducedMotion()
  const target = Math.min(N, Math.max(progress > 0 ? 1 : 0, Math.round(Math.min(1, progress) * N)))
  const [lit, setLit] = useState(sweep && !reduce ? 0 : target)
  useEffect(() => {
    if (!sweep || reduce) return setLit(target)
    const c = animate(0, [0, N, target], { duration: 1.35, times: [0, 0.38, 1], ease: [ease.out, ease.inOut], delay: 0.2, onUpdate: (v) => setLit(Math.round(v)) })
    return () => c.stop()
  }, [target, sweep, reduce])
  const blink = status === 'overdue' && !reduce
  return (
    <div className="grid h-7 grid-cols-[repeat(28,1fr)] gap-[3px]" aria-hidden="true">
      {Array.from({ length: N }, (_, i) => {
        const red = i / N >= REDLINE
        const on = i < lit
        const bg = on ? (red || status === 'overdue' ? '#FF4D2E' : status === 'warn' && i >= target - 3 ? '#FFB020' : '#D4FF3A') : red ? '#3A1C1A' : '#262C35'
        return (
          <m.i
            key={i}
            className="block rounded-[3px]"
            style={{ background: bg, boxShadow: on ? `0 0 12px -2px ${bg}` : 'none' }}
            animate={blink && on ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
            transition={blink ? { duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay: 1.6 } : undefined}
          />
        )
      })}
    </div>
  )
}

// Contachilometri a rulli: ogni cifra rulla in avanti dal valore precedente, da destra verso sinistra
export const Odometer = ({ value, from, className = '' }: { value: number; from?: number; className?: string }) => {
  const reduce = useReducedMotion()
  const text = int(Math.max(0, value))
  const prev = int(Math.max(0, from ?? value)).padStart(text.length, '0')
  return (
    <span className={`inline-flex overflow-hidden leading-none ${className}`} aria-label={`${text} km`} role="img">
      {[...text].map((ch, i) => {
        if (!/\d/.test(ch)) return <span key={i} aria-hidden="true" className="opacity-60">{ch}</span>
        const d = Number(ch)
        const p = /\d/.test(prev[i] ?? '') ? Number(prev[i]) : 0
        const to = d >= p ? d : d + 10
        return (
          <span key={i} aria-hidden="true" className="relative inline-block h-[1em] w-[0.6em] overflow-hidden">
            <m.span
              className="absolute inset-x-0 top-0 grid text-center"
              initial={reduce ? false : { y: `-${p}em` }}
              animate={{ y: `-${reduce ? d : to}em` }}
              transition={{ duration: 1.1, delay: 0.25 + (text.length - i) * 0.05, ease: ease.out }}
            >
              {[...'01234567890123456789'].map((n, k) => <span key={k} className="h-[1em]">{n}</span>)}
            </m.span>
          </span>
        )
      })}
    </span>
  )
}

const chip: Record<Status, string> = {
  ok: 'bg-white/8 text-display-dim',
  warn: 'bg-[#FFB020]/14 text-[#FFC24D]',
  overdue: 'bg-[#FF4D2E]/16 text-[#FF8A75]',
}
const chipText: Record<Status, string> = { ok: 'In regola', warn: 'In scadenza', overdue: 'Scaduta' }
export const DisplayChip = ({ status, label }: { status: Status; label?: string }) => (
  <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold ${chip[status]}`}>
    <i className="size-1.5 rounded-full bg-current" />
    {label ?? chipText[status]}
  </span>
)
