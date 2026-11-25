import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { addReading, KmDecreasingError } from './db'
import type { Bike } from './domain/types'
import { km as fmtKm, today } from './format'
import { dur, ease } from './motion'
import { toast } from './toast'
import { Celebrate, ErrorText, Sheet, btn } from './ui'

// Foglio "Aggiorna km": un campo grande, il dato precedente come riferimento, festeggiamento al salvataggio
export const KmSheet = ({ open, bike, km, onClose, onSaved }: { open: boolean; bike: Bike; km: number; onClose: () => void; onSaved: (prev: number) => Promise<void> }) => {
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
      toast(diff > 0 ? `+${diff.toLocaleString('it-IT')} km salvati` : 'Km confermati', { body: `${bike.make} ${bike.model} · ${fmtKm(n)}` })
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
          <motion.h3 className="t-title m-0 -mt-4 text-[22px]" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: dur.slow, ease: ease.out }}>
            {done > 0 ? `+${done.toLocaleString('it-IT')} km registrati` : 'Km confermati'}
          </motion.h3>
          <motion.p className="m-0 mt-1.5 max-w-[30ch] text-[14px] text-ink-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            Le scadenze sono state ricalcolate su {fmtKm(n)}.
          </motion.p>
          <button type="button" onClick={close} className={`${btn.ink} mt-6 w-full`}>Chiudi</button>
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-4 pb-1">
          <label htmlFor="km" className="text-[13px] font-medium text-ink-2">Km letti sul cruscotto</label>
          <div className="-mt-2 flex h-[72px] items-center rounded-lg bg-surface px-4 ring-2 ring-ink dark:ring-lime">
            <input
              id="km" name="km" required inputMode="numeric" pattern="[0-9.]*" autoComplete="off" enterKeyHint="done"
              placeholder={km.toLocaleString('it-IT')}
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, '') ? Number(e.target.value.replace(/[^\d]/g, '')).toLocaleString('it-IT') : '')}
              className="t-num w-full min-w-0 bg-transparent text-[40px] text-ink outline-none placeholder:text-ink-3/60"
              aria-describedby="km-hint"
            />
            <span className="text-[15px] font-medium text-ink-3">km</span>
          </div>
          <div id="km-hint" className="flex items-center justify-between rounded-md bg-lime-soft px-3.5 py-2.5 text-[13px] text-ink-2">
            <span>Ultimo dato: {fmtKm(km)}</span>
            {diff > 0 && <motion.b key={diff} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-semibold text-lime-ink">+{diff.toLocaleString('it-IT')} km</motion.b>}
          </div>
          {error && <ErrorText>{error}</ErrorText>}
          <button className={`${btn.primary} w-full`} disabled={!value}><Check size={18} strokeWidth={2.6} />Salva km</button>
        </form>
      )}
    </Sheet>
  )
}
