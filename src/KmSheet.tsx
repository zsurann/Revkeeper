import { m } from 'motion/react'
import { Check, Trash2, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { addReading, correctReading, KmBelowServiceError, KmDecreasingError, listByBike, remove } from './db'
import type { Bike, OdometerReading, Service } from './domain/types'
import { daysBetween } from './domain/due'
import { fullDate, int, km as fmtKm, today } from './format'
import { dur, ease } from './motion'
import { toast } from './toast'
import { Celebrate, ErrorText, Sheet, btn } from './ui'

// Foglio "Aggiorna km": un campo grande, il dato precedente come riferimento, correzione in caso di errore di battitura
// Ultime letture, con la possibilità di cancellare quella sbagliata (es. una cifra in più)
const History = ({ rows, onRemoved }: { rows: OdometerReading[]; onRemoved: () => Promise<void> }) => {
  const [ask, setAsk] = useState<string>()
  const latest = rows.slice(0, 5)
  if (!latest.length) return null
  return (
    <details className="group rounded-md ring-1 ring-line">
      <summary className="flex h-11 items-center justify-between px-3.5 text-[13px] font-medium text-ink-2">Letture precedenti<span className="text-ink-3 transition-transform group-open:rotate-180" aria-hidden="true">▾</span></summary>
      <ul className="m-0 grid list-none gap-0 border-t border-line p-0">
        {latest.map((r) => (
          <li key={r.id} className="flex min-h-11 items-center justify-between gap-2 border-b border-line px-3.5 last:border-0">
            <span className="text-[14px]"><b className="t-num text-ink">{fmtKm(r.km)}</b> <span className="text-ink-3">· {fullDate(r.date)}</span></span>
            {ask === r.id ? (
              <span className="flex items-center gap-1">
                <button type="button" onClick={() => void remove('readings', r.id).then(async () => { setAsk(undefined); toast('Lettura cancellata', { kind: 'info', body: fmtKm(r.km) }); await onRemoved() })} className={`${btn.danger} h-8! px-3! text-[12px]!`}>Cancella</button>
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
  const [done, setDone] = useState<{ diff: number; corrected: boolean; km: number }>()
  const [readings, setReadings] = useState<OdometerReading[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [confirmBig, setConfirmBig] = useState(false)

  const loadHistory = useCallback(async () => {
    const [r, s] = await Promise.all([listByBike('readings', bike.id), listByBike('services', bike.id)])
    setReadings(r.sort((a, b) => b.km - a.km || b.date.localeCompare(a.date)))
    setServices(s.sort((a, b) => b.km - a.km || b.date.localeCompare(a.date)))
  }, [bike.id])

  useEffect(() => {
    if (open) void loadHistory()
  }, [open, km, loadHistory])

  const hasValue = value.trim() !== ''
  const n = Number(value.replace(/\D/g, ''))
  const diff = hasValue ? n - km : 0
  const isLowering = hasValue && n < km
  const topService = services[0]
  const belowService = isLowering && topService && n < topService.km ? topService : undefined
  const aboveReadings = isLowering && !belowService ? readings.filter((r) => r.km > n) : []
  const willLowerStart = isLowering && !belowService && n < bike.startKm
  // Una cifra in più (27.000 → 270.000) sballa tutte le scadenze: oltre ~1.000 km al giorno chiediamo conferma
  const lastDate = [...readings.map((r) => r.date), bike.startDate].sort().at(-1) ?? today()
  const isBigJump = diff > Math.max(3000, 1000 * Math.max(1, daysBetween(lastDate, today())))

  const close = () => {
    onClose()
    setTimeout(() => { setValue(''); setError(''); setDone(undefined); setConfirmBig(false) }, 250)
  }
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (belowService) {
      setError(`I km non possono scendere sotto ${fmtKm(belowService.km)} (intervento registrato il ${fullDate(belowService.date)}).`)
      return
    }
    if (isBigJump && !confirmBig) return setConfirmBig(true)
    try {
      if (isLowering) {
        await correctReading(bike, today(), n)
        setError('')
        setDone({ diff, corrected: true, km: n })
        await onSaved(km)
      } else {
        await addReading(bike, today(), n)
        setError('')
        setDone({ diff, corrected: false, km: n })
        await onSaved(km)
      }
    } catch (err) {
      setError(err instanceof KmBelowServiceError || err instanceof KmDecreasingError || err instanceof RangeError ? err.message : 'Salvataggio non riuscito')
    }
  }

  return (
    <Sheet open={open} onClose={close} title={done !== undefined ? 'Fatto' : 'Aggiorna km'}>
      {done !== undefined ? (
        <div className="grid justify-items-center pb-2 text-center">
          <Celebrate />
          <m.h3 className="t-title m-0 -mt-4 text-[22px]" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: dur.slow, ease: ease.out }}>
            {done.corrected ? 'Lettura corretta' : done.diff > 0 ? `+${int(done.diff)} km registrati` : 'Km confermati'}
          </m.h3>
          <m.p className="m-0 mt-1.5 max-w-[30ch] text-[14px] text-ink-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            Le scadenze sono state ricalcolate su {fmtKm(done.km)}.
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
              onChange={(e) => {
                setError('')
                setConfirmBig(false)
                setValue(e.target.value.replace(/[^\d]/g, '') ? int(Number(e.target.value.replace(/[^\d]/g, ''))) : '')
              }}
              className="t-num w-full min-w-0 bg-transparent text-[40px] text-ink outline-none placeholder:text-ink-3/60"
              aria-describedby="km-hint"
            />
            <span className="text-[15px] font-medium text-ink-3">km</span>
          </div>
          <div id="km-hint" className={`flex items-center justify-between rounded-md px-3.5 py-2.5 text-[13px] text-ink-2 ${belowService ? 'bg-red-soft' : isLowering ? 'bg-amber-soft' : 'bg-lime-soft'}`}>
            <span>Ultimo dato: {fmtKm(km)}</span>
            {diff > 0 && <m.b key={diff} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-semibold text-lime-ink">+{int(diff)} km</m.b>}
            {isLowering && (
              <m.b key={diff} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`font-semibold ${belowService ? 'text-red-ink' : 'text-amber-ink'}`}>
                {int(diff)} km
              </m.b>
            )}
          </div>
          {belowService && (
            <ErrorText>
              I km non possono scendere sotto {fmtKm(belowService.km)} (intervento registrato il {fullDate(belowService.date)}). Modifica prima l'intervento dal libretto.
            </ErrorText>
          )}
          {isLowering && !belowService && (
            <div role="status" className="flex gap-3 rounded-md bg-amber-soft p-3.5 text-[13px] leading-snug text-ink ring-1 ring-amber/30">
              <TriangleAlert size={18} className="mt-0.5 shrink-0 text-amber-ink" />
              <span>
                Stai abbassando i km da <b>{fmtKm(km)}</b> a <b>{fmtKm(n)}</b>.{' '}
                {aboveReadings.length === 1
                  ? `La lettura da ${fmtKm(aboveReadings[0]!.km)} verrà sostituita con ${fmtKm(n)}`
                  : aboveReadings.length > 1
                    ? `Le ${aboveReadings.length} letture oltre ${fmtKm(n)} verranno sostituite con ${fmtKm(n)}`
                    : `Il dato iniziale verrà aggiornato a ${fmtKm(n)}`}
                {aboveReadings.length > 0 && willLowerStart ? ` (aggiornando anche i km iniziali a ${fmtKm(n)})` : ''}
                {' '}e le scadenze si ricalcoleranno in automatico.
              </span>
            </div>
          )}
          {isBigJump && (
            <div role="status" className="flex gap-3 rounded-md bg-amber-soft p-3.5 text-[13px] leading-snug text-ink ring-1 ring-amber/30">
              <TriangleAlert size={18} className="mt-0.5 shrink-0 text-amber-ink" />
              <span><b>+{int(diff)} km</b> dall'ultimo dato: è tanto. Controlla di non aver scritto una cifra in più.</span>
            </div>
          )}
          {error && !belowService && <ErrorText>{error}</ErrorText>}
          <button
            className={`${isLowering && !belowService ? btn.ink : btn.primary} w-full`}
            disabled={!value || Boolean(belowService)}
          >
            <Check size={18} strokeWidth={2.6} />{isLowering && !belowService ? 'Correggi lettura' : isBigJump && confirmBig ? `Sì, salva ${fmtKm(n)}` : 'Salva km'}
          </button>
          {open && <History rows={readings} onRemoved={async () => { await loadHistory(); await onChange() }} />}
        </form>
      )}
    </Sheet>
  )
}
