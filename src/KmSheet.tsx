import { m } from 'motion/react'
import { Check, Trash2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { addReading, KmDecreasingError, listByBike, remove } from './db'
import type { Bike, OdometerReading } from './domain/types'
import { fullDate, int, km as fmtKm, today } from './format'
import { dur, ease } from './motion'
import { toast } from './toast'
import { Celebrate, ErrorText, Sheet, btn } from './ui'

// Foglio "Aggiorna km": un campo grande, il dato precedente come riferimento, festeggiamento al salvataggio
// Ultime letture, con la possibilità di cancellare quella sbagliata (es. una cifra in più)
const History = ({ bike, onRemoved }: { bike: Bike; onRemoved: () => Promise<void> }) => {
  const [rows, setRows] = useState<OdometerReading[]>()
  const [ask, setAsk] = useState<string>()
  const load = () => listByBike('readings', bike.id).then((r) => setRows(r.sort((a, b) => b.km - a.km || b.date.localeCompare(a.date)).slice(0, 5)))
  useEffect(() => { void load() }, [bike.id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!rows?.length) return null
  return (
    <details className="group rounded-md ring-1 ring-line">
      <summary className="flex h-11 items-center justify-between px-3.5 text-[13px] font-medium text-ink-2">Letture precedenti<span className="text-ink-3 transition-transform group-open:rotate-180" aria-hidden="true">▾</span></summary>
      <ul className="m-0 grid list-none gap-0 border-t border-line p-0">
        {rows.map((r) => (
          <li key={r.id} className="flex min-h-11 items-center justify-between gap-2 border-b border-line px-3.5 last:border-0">
            <span className="text-[14px]"><b className="t-num text-ink">{fmtKm(r.km)}</b> <span className="text-ink-3">· {fullDate(r.date)}</span></span>
            {ask === r.id ? (
              <span className="flex items-center gap-1">
                <button type="button" onClick={() => void remove('readings', r.id).then(async () => { setAsk(undefined); toast('Lettura cancellata', { kind: 'info', body: fmtKm(r.km) }); await load(); await onRemoved() })} className={`${btn.danger} h-8! px-3! text-[12px]!`}>Cancella</button>
                <button type="button" onClick={() => setAsk(undefined)} className={`${btn.ghost} h-8! px-3! text-[12px]!`}>No</button>
              </span>
            ) : (
              <button type="button" onClick={() => setAsk(r.id)} className={btn.icon} aria-label={`Cancella la lettura di ${fmtKm(r.km)}`}><Trash2 size={15} /></button>
            )}
          </li>
        ))}
      </ul>
    </details>
  )
}

export const KmSheet = ({ open, bike, km, onClose, onSaved, onChange }: { open: boolean; bike: Bike; km: number; onClose: () => void; onSaved: (prev: number) => Promise<void>; onChange: () => Promise<void> }) => {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState<number>()
  const n = Number(value.replace(/\D/g, ''))
  const diff = value ? n - km : 0

  const close = () => {
    onClose()
    setTimeout(() => { setValue(''); setError(''); setDone(undefined) }, 250)
  }
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    try {
      await addReading(bike, today(), n)
      setError('')
      setDone(diff)
      toast(diff > 0 ? `+${int(diff)} km salvati` : 'Km confermati', { body: `${bike.make} ${bike.model} · ${fmtKm(n)}` })
      await onSaved(km)
    } catch (err) {
      setError(err instanceof KmDecreasingError || err instanceof RangeError ? err.message : 'Salvataggio non riuscito')
    }
  }

  return (
    <Sheet open={open} onClose={close} title={done !== undefined ? 'Fatto' : 'Aggiorna km'}>
      {done !== undefined ? (
        <div className="grid justify-items-center pb-2 text-center">
          <Celebrate />
          <m.h3 className="t-title m-0 -mt-4 text-[22px]" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: dur.slow, ease: ease.out }}>
            {done > 0 ? `+${int(done)} km registrati` : 'Km confermati'}
          </m.h3>
          <m.p className="m-0 mt-1.5 max-w-[30ch] text-[14px] text-ink-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            Le scadenze sono state ricalcolate su {fmtKm(n)}.
          </m.p>
          <button type="button" onClick={close} className={`${btn.ink} mt-6 w-full`}>Chiudi</button>
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-4 pb-1">
          <label htmlFor="km" className="text-[13px] font-medium text-ink-2">Km letti sul cruscotto</label>
          <div className="-mt-2 flex h-[72px] items-center rounded-lg bg-surface px-4 ring-2 ring-ink dark:ring-lime">
            <input
              id="km" name="km" required inputMode="numeric" pattern="[0-9.]*" autoComplete="off" enterKeyHint="done"
              placeholder={int(km)}
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, '') ? int(Number(e.target.value.replace(/[^\d]/g, ''))) : '')}
              className="t-num w-full min-w-0 bg-transparent text-[40px] text-ink outline-none placeholder:text-ink-3/60"
              aria-describedby="km-hint"
            />
            <span className="text-[15px] font-medium text-ink-3">km</span>
          </div>
          <div id="km-hint" className="flex items-center justify-between rounded-md bg-lime-soft px-3.5 py-2.5 text-[13px] text-ink-2">
            <span>Ultimo dato: {fmtKm(km)}</span>
            {diff > 0 && <m.b key={diff} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-semibold text-lime-ink">+{int(diff)} km</m.b>}
          </div>
          {error && <ErrorText>{error}</ErrorText>}
          <button className={`${btn.primary} w-full`} disabled={!value}><Check size={18} strokeWidth={2.6} />Salva km</button>
          {open && <History bike={bike} onRemoved={onChange} />}
        </form>
      )}
    </Sheet>
  )
}
