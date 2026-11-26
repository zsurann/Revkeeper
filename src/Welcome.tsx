import { AnimatePresence, m } from 'motion/react'
import { Bell, Plus } from 'lucide-react'
import { useCallback, useState } from 'react'
import { listBikes } from './db'
import { GoogleButton } from './GoogleButton'
import { IgnitionMark, Mark } from './Mark'
import { HourSelect, enablePush, pushSupported } from './Notifications'
import { ease } from './motion'
import { EdgeSwipeBack, supportsEdgeSwipeBack } from './EdgeSwipeBack'
import { useBackDepth } from './historyLayers'
import { btn } from './ui'

// Benvenuto al primo avvio: accesso con Google (o più tardi), promemoria, prima moto.
type Step = 'login' | 'push' | 'bike'

const big = `${btn.primary} h-14 w-full text-[17px]`
const later = `${btn.ghost} h-12 w-full text-[15px]`
const slide = { initial: { opacity: 0, x: 28 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 }, transition: { duration: 0.42, ease: ease.out } }

// Anteprima di una notifica, come arriva sul telefono (stesso formato titolo/testo del server)
const NotificationPreview = () => (
  <div className="relative grid h-[210px] content-center gap-2 overflow-hidden rounded-xl bg-[linear-gradient(160deg,#2B3A1A_0%,#0E1116_70%)] px-3.5" aria-hidden="true">
    <span className="absolute left-0 right-0 top-4 text-center text-[13px] font-medium text-white/70">martedì 9 dicembre</span>
    <m.div initial={{ opacity: 0, y: -22, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.9, delay: 0.25, ease: ease.out }}
      className="mt-6 grid gap-0.5 rounded-[20px] bg-white/80 px-3.5 py-3 text-[#0E1116] shadow-[0_12px_30px_-12px_rgb(0_0_0/0.6)] backdrop-blur-xl">
      <span className="flex items-center gap-2 text-[12px] text-[#474F5C]"><Mark size={18} className="rounded-[5px]" />REVKEEPER<span className="ml-auto">ora</span></span>
      <b className="text-[15px] font-semibold">L'assicurazione scade tra 7 giorni</b>
      <span className="text-[14px] text-[#2B313A]">La tua moto</span>
    </m.div>
    <m.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 0.55, y: 0 }} transition={{ duration: 0.7, delay: 0.7, ease: ease.out }}
      className="mx-3 h-3 rounded-b-[14px] bg-white/50" />
  </div>
)

// Moto stilizzata che si disegna da sola
const BikeDrawing = () => (
  <svg viewBox="0 0 24 24" width="200" height="200" className="mx-auto mt-6" fill="none" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="5.5" cy="16" r="3.5" pathLength={1} stroke="var(--rk-ink)" className="[stroke-dasharray:1] animate-[trace_1.6s_cubic-bezier(.65,0,.35,1)_200ms_both]" />
    <circle cx="18.5" cy="16" r="3.5" pathLength={1} stroke="var(--rk-ink)" className="[stroke-dasharray:1] animate-[trace_1.6s_cubic-bezier(.65,0,.35,1)_200ms_both]" />
    <path d="M5.5 16L10 13h4l2.6-3.6M16.6 9.4L18.5 16M15.4 8.1l2.6-.6M7.2 11.6c1.4-1.2 2.6-1.4 4-1.1h2.3c1-.9 2-1.1 3.1-1.1" stroke="var(--rk-lime-ink)" strokeWidth="1.1" pathLength={1} className="[stroke-dasharray:1] animate-[trace_1.6s_cubic-bezier(.65,0,.35,1)_500ms_both]" />
  </svg>
)

export const Welcome = ({ onDone }: { onDone: () => void }) => {
  const [stepStack, setStepStack] = useState<Step[]>(['login'])
  const step = stepStack[stepStack.length - 1]!
  const goStep = (s: Step) => setStepStack((st) => [...st, s])
  const goBackStep = useCallback(() => setStepStack((st) => (st.length > 1 ? st.slice(0, -1) : st)), [])
  useBackDepth(stepStack.length - 1, goBackStep)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [hour, setHour] = useState(9)

  // Le notifiche si offrono anche senza Google (account ospite). Se dopo l'accesso arrivano moto già salvate, la scheda della prima moto non serve.
  const after = async (from: Step) => {
    setMsg('')
    if (from === 'login' && pushSupported()) return goStep('push')
    if ((await listBikes()).length > 0) return onDone()
    goStep('bike')
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
    <EdgeSwipeBack enabled={stepStack.length > 1 && supportsEdgeSwipeBack()} onBack={goBackStep}>
    <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col px-6 pb-[max(28px,env(safe-area-inset-bottom))] pt-[max(24px,env(safe-area-inset-top))]">
      <div role="progressbar" aria-label="Benvenuto" aria-valuemin={1} aria-valuemax={3} aria-valuenow={at + 1} className="grid grid-cols-3 gap-1.5">
        {steps.map((s, i) => (
          <span key={s} className="relative h-1.5 overflow-hidden rounded-full bg-line">
            <m.i className="absolute inset-0 origin-left rounded-full bg-ink dark:bg-lime" initial={false} animate={{ scaleX: i <= at ? 1 : 0 }} transition={{ duration: 0.5, ease: ease.out }} />
          </span>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 'login' && (
          <m.section key="login" {...slide} className="flex flex-1 flex-col">
            <div className="mt-12 grid justify-items-start gap-6">
              <IgnitionMark size={96} />
              <h1 className="t-display m-0 text-[40px]">Ogni scadenza, al momento giusto.</h1>
            </div>
            <p className="m-0 mt-4 text-[16px] leading-relaxed text-ink-2">Tagliandi, documenti e spese della tua moto in un posto solo. Accedi con Google per ritrovare tutto se cambi telefono.</p>
            <div className="mt-auto grid justify-items-center gap-2.5 pt-8">
              <GoogleButton onBusy={setBusy} onDone={(err) => (err ? setMsg(err) : void after('login'))} />
              <button type="button" onClick={() => void after('login')} className={later}>Più tardi</button>
              <p className="m-0 text-center text-[12px] text-ink-3">Puoi accedere quando vuoi da Account.</p>
            </div>
          </m.section>
        )}

        {step === 'push' && (
          <m.section key="push" {...slide} className="flex flex-1 flex-col">
            <div className="mt-10"><NotificationPreview /></div>
            <h1 className="t-display m-0 mt-8 flex items-center gap-3 text-[34px]">
              <Bell size={30} className="shrink-0 origin-[50%_10%] animate-[ring_2.4s_ease-in-out_600ms_infinite] text-lime-ink" strokeWidth={2.2} />
              Promemoria puntuali
            </h1>
            <p className="m-0 mt-3 text-[16px] leading-relaxed text-ink-2">Ti avvisiamo 30 giorni, 7 giorni e il giorno stesso di ogni scadenza, e quando un tagliando si avvicina.</p>
            <label className="mt-5 grid gap-1.5 text-[13px] font-medium text-ink-2">
              Ora dei promemoria
              <HourSelect id="welcome-hour" value={hour} onChange={setHour} />
            </label>
            <p className="m-0 mt-3 text-[12px] text-ink-3">Funzionano anche senza account Google: il server riceve solo i dati della moto, in forma anonima.</p>
            <div className="mt-auto grid gap-2.5 pt-8">
              <button type="button" onClick={() => void enable()} disabled={busy} className={big}><Bell size={19} />Attiva notifiche</button>
              <button type="button" onClick={() => void after('push')} className={later}>Non ora</button>
            </div>
          </m.section>
        )}

        {step === 'bike' && (
          <m.section key="bike" {...slide} className="flex flex-1 flex-col">
            <BikeDrawing />
            <h1 className="t-display m-0 mt-4 text-[38px]">Aggiungi la tua moto</h1>
            <p className="m-0 mt-3 text-[16px] leading-relaxed text-ink-2">Scegli marca, modello e anno: intervalli, gomme e dati tecnici si compilano da soli.</p>
            <div className="mt-auto grid pt-8">
              <button type="button" onClick={onDone} className={big}><Plus size={20} strokeWidth={2.6} />Aggiungi moto</button>
            </div>
          </m.section>
        )}
      </AnimatePresence>

      {msg && <p role="status" className="m-0 mt-3 text-center text-[14px] font-medium text-red-ink">{busy ? 'Attendi…' : msg}</p>}
    </main>
    </EdgeSwipeBack>
  )
}
