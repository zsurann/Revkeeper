import type { Due } from './domain/due'
import type { Status } from './domain/types'
import { dueRule, dueShort, statusColor, statusText } from './format'

const LEN = 460 // lunghezza dell'arco SVG da 240°

export const ServiceArc = ({ progress, label }: { progress: number; label: string }) => {
  const p = Math.min(1, progress)
  return (
    <svg viewBox="0 0 280 200" className="mx-auto -mb-16 w-full max-w-[280px]" role="img" aria-label={`${label}: ${Math.round(progress * 100)}% dell'intervallo`}>
      <path d="M30 170 A110 110 0 1 1 250 170" fill="none" stroke="#2a3240" strokeWidth="10" strokeLinecap="round" />
      <path
        d="M30 170 A110 110 0 1 1 250 170"
        fill="none"
        stroke={progress >= 1 ? 'var(--color-red)' : 'var(--color-amber)'}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={LEN}
        strokeDashoffset={LEN * (1 - p)}
        className="animate-[arc_var(--duration-roll)_var(--ease-needle)] drop-shadow-glow"
        style={{ ['--arc-from' as string]: LEN }}
      />
      <text x="140" y="70" textAnchor="middle" fill="var(--color-dim)" fontSize="11">verso: {label.toLowerCase()}</text>
    </svg>
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
        <span className="min-w-0">{r.label}</span>
        <span className={`shrink-0 ${statusColor[r.status]}`}>
          {r.right}
          {r.status !== 'ok' && <span className="sr-only"> ({statusText[r.status]})</span>}
        </span>
      </li>
    ))}
  </ul>
)
