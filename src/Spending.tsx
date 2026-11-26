import { m } from 'motion/react'
import type { Spending as Stats } from './domain/spending'
import { eur } from './format'
import { dur, ease } from './motion'
import { card } from './ui'

// Spese per anno (barre) e per voce: con "riduci movimento" le barre compaiono già piene
export const Spending = ({ s, year }: { s: Stats; year: string }) => {
  const thisYear = s.byYear.find((y) => y.year === year)?.total ?? 0
  const maxYear = Math.max(...s.byYear.map((y) => y.total), 1)
  const top = s.byItem.slice(0, 3)
  const maxItem = Math.max(...top.map((i) => i.total), 1)
  const years = s.byYear.slice(-6)
  return (
    <section aria-labelledby="spese" className={`${card} grid gap-5 p-4`}>
      <div className="grid grid-cols-3 gap-3">
        <span className="grid min-w-0 gap-0.5"><span className="text-[12px] text-ink-3">Nel {year}</span><b className="t-num truncate text-[clamp(17px,5.4vw,22px)] leading-tight">{eur(thisYear)}</b></span>
        <span className="grid min-w-0 gap-0.5"><span className="text-[12px] text-ink-3">In tutto</span><b className="t-num truncate text-[clamp(17px,5.4vw,22px)] leading-tight">{eur(s.total)}</b></span>
        <span className="grid min-w-0 gap-0.5"><span className="text-[12px] text-ink-3">Al km</span><b className="t-num truncate text-[clamp(17px,5.4vw,22px)] leading-tight">{s.perKm !== undefined ? eur(s.perKm) : '—'}</b></span>
      </div>
      <h2 id="spese" className="sr-only">Spese</h2>
      {years.length > 1 && (
        <figure className="m-0 grid gap-2">
          <figcaption className="t-label text-ink-3">Per anno</figcaption>
          <div className="flex h-20 items-end gap-2" role="list">
            {years.map((y, i) => (
              <div key={y.year} role="listitem" className="grid h-full flex-1 grid-rows-[1fr_auto] items-end justify-items-center gap-1" aria-label={`${y.year}: ${eur(y.total)}`}>
                <m.span
                  className={`w-full max-w-12 origin-bottom rounded-t-[6px] ${y.year === year ? 'bg-lime' : 'bg-ink/15 dark:bg-white/20'}`}
                  style={{ height: `${Math.max(3, (y.total / maxYear) * 100)}%` }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: dur.slow, ease: ease.out, delay: 0.05 * i }}
                />
                <span className="text-[11px] font-medium text-ink-3">{y.year}</span>
              </div>
            ))}
          </div>
        </figure>
      )}
      {top.length > 1 && (
        <div className="grid gap-2.5">
          <span className="t-label text-ink-3">Dove vanno</span>
          <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0">
            {top.map((i, k) => (
              <li key={i.label} className="grid min-w-0 gap-1">
                <span className="flex min-w-0 items-start justify-between gap-3 text-[13px]"><span className="line-clamp-2 min-w-0 text-ink-2">{i.label}</span><b className="t-num shrink-0 text-ink">{eur(i.total)}</b></span>
                <span className="h-1.5 overflow-hidden rounded-full bg-sunken">
                  <m.span className="block h-full origin-left rounded-full bg-ink dark:bg-lime" style={{ width: `${(i.total / maxItem) * 100}%` }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: dur.slow, ease: ease.out, delay: 0.1 + 0.05 * k }} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
