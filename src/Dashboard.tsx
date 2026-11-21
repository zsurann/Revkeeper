import type { Due } from './domain/due'
import type { Status } from './domain/types'
import { dueRule, dueShort, monthYear, statusColor, statusText } from './format'

const LEN = 502.65 // lunghezza dell'arco SVG da 240° con raggio 120
const ARC = 'M 46.1 220 A 120 120 0 1 1 253.9 220'

// Quadrante a lancetta: arco che si riempie e lancetta corta che sale, supera di poco il valore e si assesta.
// Usato dal cruscotto, dalla pagina di installazione e dal benvenuto.
export const Dial = ({ progress, color = 'var(--color-amber)', label, className = '' }: { progress: number; color?: string; label?: string; className?: string }) => {
  const p = Math.min(1, Math.max(0, progress))
  return (
    <svg viewBox="0 0 300 236" className={className} {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}>
      <defs>
        <filter id="arc-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path d={ARC} fill="none" stroke="var(--color-well)" strokeWidth="16" strokeLinecap="round" />
      <path d="M 59.9 212 A 104 104 0 1 1 240.1 212" fill="none" stroke="#3a4454" strokeWidth="5" strokeDasharray="1.5 34.8" />
      <path
        d={ARC}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={LEN}
        strokeDashoffset={LEN * (1 - p)}
        filter="url(#arc-glow)"
        className="animate-[arc_var(--duration-roll)_var(--ease-needle)]"
        style={{ ['--arc-from' as string]: LEN }}
      />
      <g
        className="animate-[needle_var(--duration-roll)_var(--ease-needle)] [transform-box:view-box] [transform-origin:150px_160px]"
        style={{ transform: `rotate(${-120 + 240 * p}deg)`, ['--needle-to' as string]: `${-120 + 240 * p}deg` }}
      >
        {/* lancetta corta vicino all'arco, come sui cruscotti TFT: il centro resta libero per il numero */}
        <path d="M146.6 84 L150 52 L153.4 84 Z" fill={color} filter="url(#arc-glow)" />
      </g>
    </svg>
  )
}

export const ServiceArc = ({ due, label }: { due: Due; label: string }) => {
  const over = due.status === 'overdue'
  const big = due.kmLeft !== undefined ? `${Math.abs(due.kmLeft).toLocaleString('it-IT')} km` : due.dueDate ? monthYear(due.dueDate) : ''
  return (
    <section className="relative mx-auto w-full max-w-[340px]" aria-label="Prossima manutenzione">
      <Dial progress={due.progress} color={over ? 'var(--color-red)' : undefined} label={`${label}: ${Math.round(due.progress * 100)}% dell'intervallo`} className="w-full" />
      <div className="pointer-events-none absolute inset-x-0 top-[44%] grid justify-items-center animate-[rise_600ms_var(--ease-needle)_400ms_both]">
        <span className={`font-gauge text-[44px] font-semibold leading-none ${over ? 'text-red' : ''}`}>{big}</span>
        <span className="text-sm text-dim">{over ? `${label}, scaduta` : label}</span>
      </div>
    </section>
  )
}

export type Row = { id: string; label: string; status: Status; due?: Due; right: string }

export const NextServiceCard = ({ label, due }: { label: string; due: Due }) => (
  <section className="grid gap-2.5 rounded-panel bg-panel p-4" aria-label="Prossima manutenzione">
    <div className="flex items-baseline justify-between gap-3">
      <b className="font-gauge text-lg">{label}</b>
      <span className={`shrink-0 ${due.status === 'ok' ? 'text-ink' : statusColor[due.status]}`}>{dueShort(due)}</span>
    </div>
    <div className="h-2 overflow-hidden rounded bg-well">
      <i className="block h-full rounded bg-gradient-to-r from-amber to-red" style={{ width: `${Math.min(100, due.progress * 100)}%` }} />
    </div>
    <p className="m-0 text-sm text-dim">
      {dueRule(due)}
      {due.status !== 'ok' && <span className="sr-only"> ({statusText[due.status]})</span>}
    </p>
  </section>
)

export const DueList = ({ rows }: { rows: Row[] }) => (
  <ul className="m-0 grid list-none p-0">
    {rows.map((r) => (
      <li key={r.id} className="flex justify-between gap-3 border-b border-rule px-1 py-3 text-[15px]">
        <span className="flex min-w-0 items-center gap-2.5">
          <i aria-hidden="true" className={`size-2 shrink-0 rounded-full ${r.status === 'ok' ? 'bg-[#3a4454]' : r.status === 'warn' ? 'bg-amber shadow-[0_0_8px_rgb(255_181_71/0.7)]' : 'bg-red shadow-[0_0_8px_rgb(255_107_91/0.7)]'}`} />
          <span className="min-w-0">{r.label}</span>
        </span>
        <span className={`shrink-0 ${statusColor[r.status]}`}>
          {r.right}
          {r.status !== 'ok' && <span className="sr-only"> ({statusText[r.status]})</span>}
        </span>
      </li>
    ))}
  </ul>
)
