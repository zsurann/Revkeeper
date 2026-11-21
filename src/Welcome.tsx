import { useState } from 'react'
import { Dial } from './Dashboard'
import { getMeta, listBikes } from './db'
import { GoogleButton } from './GoogleButton'
import { enablePush, pushSupported } from './Notifications'
import { field, primary } from './ui'

// Benvenuto al primo avvio: accesso con Google (o più tardi), promemoria, prima moto.
// Prototipo approvato: issues/402-prototipo-installazione-e-benvenuto.md
type Step = 'login' | 'push' | 'bike'

const big = `${primary} h-[54px] w-full text-[19px] font-bold`
const later = 'h-12 w-full text-base text-[#c9cfda]'

export const Welcome = ({ onDone }: { onDone: () => void }) => {
  const [step, setStep] = useState<Step>('login')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [hour, setHour] = useState(9)

  // I promemoria li calcola il server sui dati sincronizzati: senza accesso il passo si salta.
  // Se dopo l'accesso arrivano moto già salvate, la scheda della prima moto non serve.
  const after = async (from: Step) => {
    setMsg('')
    const signed = !!(await getMeta<string>('account'))
    if (from === 'login' && signed && pushSupported()) return setStep('push')
    if ((await listBikes()).length > 0) return onDone()
    setStep('bike')
  }
  const enable = async () => {
    setBusy(true)
    try {
      await enablePush(hour)
      await after('push')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Attivazione non riuscita')
    } finally {
      setBusy(false)
    }
  }

  const steps: Step[] = ['login', 'push', 'bike']
  const at = steps.indexOf(step)
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col px-6 pb-[max(30px,env(safe-area-inset-bottom))] pt-[max(30px,env(safe-area-inset-top))]">
      <div role="progressbar" aria-label="Benvenuto" aria-valuemin={1} aria-valuemax={3} aria-valuenow={at + 1} className="grid grid-cols-3 gap-1.5">
        {steps.map((s, i) => (
          <span key={s} className={`h-[5px] rounded-[3px] transition-colors duration-300 ${i <= at ? 'bg-amber shadow-[0_0_8px_rgb(255_181_71/0.6)]' : 'bg-[#262e3a]'}`} />
        ))}
      </div>

      {step === 'login' && (
        <section key="login" className="flex flex-1 flex-col animate-[slide-in_420ms_var(--ease-needle)]">
          <div className="relative mx-auto mt-10 w-[260px]">
            <Dial progress={0.7} className="w-full" />
            <span className="absolute inset-x-0 top-[58%] text-center font-gauge text-3xl font-bold">Revkeeper</span>
          </div>
          <h1 className="m-0 mt-6 font-gauge text-[34px] font-bold leading-[1.05]">Benvenuto a bordo</h1>
          <p className="m-0 mt-2.5 text-[15px] leading-normal text-[#c9cfda]">Accedi con Google per salvare i dati anche online: li ritrovi se cambi telefono.</p>
          <div className="mt-auto grid justify-items-center gap-2.5 pt-6">
            <GoogleButton
              onBusy={setBusy}
              onDone={(err) => (err ? setMsg(err) : void after('login'))}
            />
            <button onClick={() => void after('login')} className={later}>Più tardi</button>
            <p className="m-0 text-center text-xs text-dim">Puoi accedere quando vuoi da Account.</p>
          </div>
        </section>
      )}

      {step === 'push' && (
        <section key="push" className="flex flex-1 flex-col animate-[slide-in_420ms_var(--ease-needle)]">
          <div className="mt-11 grid h-[200px] content-center rounded-3xl bg-[linear-gradient(180deg,#0d1320_0%,#1d2740_100%)] px-3.5" aria-hidden="true">
            <div className="grid gap-1 rounded-[18px] border border-white/6 bg-panel/95 px-3.5 py-3 animate-[drop_1.2s_var(--ease-needle)_200ms_both]">
              <div className="flex items-center gap-2 text-xs text-dim">
                <img src="/icons/icon.svg" alt="" width="16" height="16" className="rounded" />
                Revkeeper <span className="ml-auto">ora</span>
              </div>
              <b className="text-[15px] font-semibold">Assicurazione scade tra 7 giorni</b>
              <span className="text-sm text-[#c9cfda]">La tua moto</span>
            </div>
          </div>
          <h1 className="m-0 mt-7 flex items-center gap-2.5 font-gauge text-[34px] font-bold leading-[1.05]">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--color-amber)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="origin-[50%_10%] animate-[ring_2.4s_ease-in-out_600ms_infinite]">
              <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z" /><path d="M10 20a2 2 0 0 0 4 0" />
            </svg>
            Promemoria puntuali
          </h1>
          <p className="m-0 mt-2.5 text-[15px] leading-normal text-[#c9cfda]">Ti avvisiamo 30 giorni, 7 giorni e il giorno stesso di ogni scadenza, e quando un tagliando si avvicina.</p>
          <label className="mt-4 grid gap-1.5 text-[13px] text-dim">
            Ora dei promemoria
            <select value={hour} onChange={(e) => setHour(Number(e.target.value))} className={field}>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{`${h}:00`}</option>)}
            </select>
          </label>
          <div className="mt-auto grid gap-2.5 pt-6">
            <button onClick={() => void enable()} disabled={busy} className={big}>Attiva notifiche</button>
            <button onClick={() => void after('push')} className={later}>Non ora</button>
          </div>
        </section>
      )}

      {step === 'bike' && (
        <section key="bike" className="flex flex-1 flex-col animate-[slide-in_420ms_var(--ease-needle)]">
          <svg viewBox="0 0 24 24" width="220" height="220" className="mx-auto mt-8" fill="none" stroke="var(--color-amber)" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="5.5" cy="16" r="3.5" pathLength={1} className="[stroke-dasharray:1] animate-[trace_1.6s_cubic-bezier(.65,0,.35,1)_200ms_both]" />
            <circle cx="18.5" cy="16" r="3.5" pathLength={1} className="[stroke-dasharray:1] animate-[trace_1.6s_cubic-bezier(.65,0,.35,1)_200ms_both]" />
            {/* naked: forcellone, telaio, serbatoio e sella, forcella e manubrio */}
            <path d="M5.5 16L10 13h4l2.6-3.6M16.6 9.4L18.5 16M15.4 8.1l2.6-.6M7.2 11.6c1.4-1.2 2.6-1.4 4-1.1h2.3c1-.9 2-1.1 3.1-1.1" stroke="var(--color-ink)" pathLength={1} className="[stroke-dasharray:1] animate-[trace_1.6s_cubic-bezier(.65,0,.35,1)_500ms_both]" />
          </svg>
          <h1 className="m-0 mt-2.5 font-gauge text-[34px] font-bold leading-[1.05]">Aggiungi la tua moto</h1>
          <p className="m-0 mt-2.5 text-[15px] leading-normal text-[#c9cfda]">Scegli marca, modello e anno: intervalli, gomme e dati tecnici si compilano da soli.</p>
          <div className="mt-auto grid pt-6">
            <button onClick={onDone} className={`${big} flex items-center justify-center gap-2`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
              Aggiungi moto
            </button>
          </div>
        </section>
      )}

      {msg && <p role="status" className="m-0 mt-3 text-center text-sm text-red">{busy ? 'Attendi…' : msg}</p>}
    </main>
  )
}
