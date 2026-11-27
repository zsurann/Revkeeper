import { ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Skeleton, link } from './ui'

type Stats = {
  at: number
  google: number
  guests: number
  new7: number
  new30: number
  active7: number
  active30: number
  push: number
  files: number
  bytes: number
  records: Partial<Record<'bikes' | 'services' | 'documents' | 'readings' | 'items' | 'attachments', number>>
  makes: { make: string | null; n: number }[]
  weeks: { google: number; guests: number }[]
}

const n = (v: number) => v.toLocaleString('it-IT')
const mb = (b: number) => `${(b / 1024 / 1024).toLocaleString('it-IT', { maximumFractionDigits: 1 })} MB`

const Tile = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="grid gap-0.5 rounded-md bg-sunken px-3 py-2.5">
    <span className="text-[12px] text-ink-3">{label}</span>
    <b className="t-num text-[22px] leading-tight">{value}</b>
    {sub && <span className="text-[12px] text-ink-3">{sub}</span>}
  </div>
)

/** Statistiche riservate all'admin: solo conteggi aggregati dal server. */
export const AdminStats = () => {
  const [s, setS] = useState<Stats>()
  const [err, setErr] = useState('')
  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => (r.ok ? (r.json() as Promise<Stats>) : Promise.reject(new Error(r.status === 404 ? 'Statistiche non disponibili per questo account' : `Errore ${r.status}`))))
      .then(setS, (e: Error) => setErr(navigator.onLine ? e.message : 'Serve la connessione'))
  }, [])

  if (err) return <p role="alert" className="m-0 text-[14px] text-red-ink">{err}</p>
  if (!s) return <div className="grid gap-2"><Skeleton className="h-20" /><Skeleton className="h-32" /></div>

  const r = s.records
  const peak = Math.max(1, ...s.weeks.map((w) => w.google + w.guests))
  const top = Math.max(1, ...s.makes.map((m) => m.n))
  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-2 gap-2">
        <Tile label="Account Google" value={n(s.google)} sub={`nuovi: +${n(s.new7)} in 7 gg, +${n(s.new30)} in 30`} />
        <Tile label="Ospiti" value={n(s.guests)} sub="notifiche senza account" />
        <Tile label="Attivi 7 giorni" value={n(s.active7)} sub={`${n(s.active30)} in 30 giorni`} />
        <Tile label="Con notifiche" value={n(s.push)} />
        <Tile label="Moto" value={n(r.bikes ?? 0)} />
        <Tile label="Interventi" value={n(r.services ?? 0)} />
        <Tile label="Documenti" value={n(r.documents ?? 0)} sub={`${n(r.readings ?? 0)} letture km`} />
        <Tile label="File" value={n(s.files)} sub={mb(s.bytes)} />
      </div>

      <section aria-labelledby="h-weeks" className="grid gap-2">
        <h3 id="h-weeks" className="m-0 text-[14px] font-semibold">Nuovi utenti, ultime 8 settimane</h3>
        <div className="flex h-28 items-end gap-1.5" role="img" aria-label={`Nuovi utenti per settimana: ${s.weeks.map((w) => w.google + w.guests).join(', ')}`}>
          {s.weeks.map((w, i) => (
            <div key={i} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-px">
              <span className="t-num text-center text-[11px] text-ink-3">{w.google + w.guests || ''}</span>
              <div className="rounded-t-[3px] bg-line-strong" style={{ height: `${(w.guests / peak) * 80}%` }} />
              <div className="rounded-[3px] bg-lime" style={{ height: `${(w.google / peak) * 80}%`, minHeight: w.google ? 3 : 0 }} />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[11px] text-ink-3"><span>8 sett. fa</span><span>questa settimana</span></div>
        <p className="m-0 flex gap-3 text-[12px] text-ink-3">
          <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-[2px] bg-lime" />Google</span>
          <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-[2px] bg-line-strong" />Ospiti</span>
        </p>
      </section>

      {s.makes.length > 0 && (
        <section aria-labelledby="h-makes" className="grid gap-2">
          <h3 id="h-makes" className="m-0 text-[14px] font-semibold">Marche più registrate</h3>
          <ul className="m-0 grid list-none gap-1.5 p-0">
            {s.makes.map((m) => (
              <li key={m.make ?? '?'} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-2 text-[13px]">
                <span className="truncate">{m.make ?? '—'}</span>
                <span className="h-2 rounded-full bg-sunken"><span className="block h-full rounded-full bg-ink dark:bg-lime" style={{ width: `${(m.n / top) * 100}%` }} /></span>
                <b className="t-num">{n(m.n)}</b>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="m-0 text-[12px] text-ink-3">
        Contano solo i telefoni che sincronizzano (account Google o notifiche attive). Visite, pagine e dispositivi di tutti sono in Cloudflare Web Analytics.
        Aggiornate alle {new Date(s.at).toLocaleTimeString('it-IT', { timeStyle: 'short' })}.
      </p>
      <a href="https://dash.cloudflare.com/?to=/:account/web-analytics" target="_blank" rel="noopener noreferrer" className={`${link} justify-self-start`}>
        Apri Web Analytics<ExternalLink size={14} />
      </a>
    </div>
  )
}
