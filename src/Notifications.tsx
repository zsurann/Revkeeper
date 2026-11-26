import { Bell, BellOff, ChevronDown, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getMeta, setMeta } from './db'
import { ensureSession } from './sync'
import { toast } from './toast'
import { btn, card, field } from './ui'

const key = () => Uint8Array.from(atob(import.meta.env.VITE_VAPID_PUBLIC_KEY.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
const post = async (path: string, body: unknown) => {
  const res = await fetch(`/api/push/${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const out = (await res.json().catch(() => ({}))) as { error?: string; sent?: number }
  if (!res.ok) throw new Error(out.error ?? `Errore ${res.status}`)
  return out
}

// Chiede il permesso (dentro il tocco dell'utente: obbligatorio su iOS), iscrive il dispositivo e salva l'ora sul server
export const enablePush = async (hour: number) => {
  if ((await Notification.requestPermission()) !== 'granted') throw new Error('Permesso negato: riattivalo dalle impostazioni del telefono')
  await ensureSession()
  await setMeta('notifyHour', hour)
  const reg = await navigator.serviceWorker.ready
  const s = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key() }))
  await post('subscribe', { subscription: s.toJSON(), hour, tz: Intl.DateTimeFormat().resolvedOptions().timeZone })
  return s
}

// Ospite scaduto (sessione lunga 180 giorni): si rifà l'iscrizione da solo, con l'ora già scelta
export const renewGuestPush = async () => {
  if (!pushSupported() || Notification.permission !== 'granted') return
  const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription()
  if (sub) await enablePush((await getMeta<number>('notifyHour')) ?? 9)
}

export const HourSelect = ({ id, value, onChange }: { id: string; value: number; onChange: (h: number) => void }) => (
  <span className="relative block">
    <select id={id} value={value} onChange={(e) => onChange(Number(e.target.value))} className={`${field} appearance-none pr-10`}>
      {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{`${String(h).padStart(2, '0')}:00`}</option>)}
    </select>
    <ChevronDown size={18} aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
  </span>
)

export const Notifications = () => {
  const [sub, setSub] = useState<PushSubscription | null>()
  const [hour, setHour] = useState(9)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!pushSupported()) return
    void navigator.serviceWorker.ready.then((r) => r.pushManager.getSubscription()).then(setSub)
    // L'ora scelta sta sul server: il menu parte da quella, non sempre dalle 09:00
    void fetch('/api/me')
      .then((r) => (r.ok ? (r.json() as Promise<{ notifyHour?: number | null }>) : undefined))
      .then((me) => { if (typeof me?.notifyHour === 'number') setHour(me.notifyHour) })
      .catch(() => undefined)
  }, [])

  if (!pushSupported())
    return (
      <div className={`${card} p-4 text-[14px] text-ink-2`}>
        Questo browser non riceve notifiche. Su iPhone: Condividi → "Aggiungi alla schermata Home", poi apri Revkeeper da lì.
      </div>
    )

  const enable = async () => {
    try {
      setSub(await enablePush(hour))
      setMsg('')
      toast(`Promemoria alle ${String(hour).padStart(2, '0')}:00`, { body: 'Ti avvisiamo prima di ogni scadenza' })
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Attivazione non riuscita')
    }
  }
  const disable = async () => {
    if (!sub) return
    await post('unsubscribe', { endpoint: sub.endpoint }).catch(() => undefined)
    await sub.unsubscribe()
    setSub(null)
    toast('Notifiche disattivate', { kind: 'info' })
  }
  const test = async () => {
    try {
      const r = await post('test', {})
      toast(r.sent ? 'Notifica di prova inviata' : 'Nessun dispositivo raggiunto', { kind: r.sent ? 'success' : 'warn' })
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Invio non riuscito')
    }
  }

  return (
    <div className={`${card} grid gap-4 p-4`}>
      <div className="flex items-start gap-3">
        <span className={`grid size-11 shrink-0 place-items-center rounded-full ${sub ? 'bg-lime text-black' : 'bg-sunken text-ink-2'}`}>{sub ? <Bell size={20} /> : <BellOff size={20} />}</span>
        <span className="grid gap-0.5">
          <b className="text-[15px] font-semibold">{sub ? 'Notifiche attive' : 'Notifiche spente'}</b>
          <span className="text-[13px] text-ink-3">Un avviso al giorno quando una scadenza è a 30 giorni, a 7 giorni o oggi, e se non aggiorni i km da 30 giorni.</span>
        </span>
      </div>
      <label className="grid gap-1.5 text-[13px] font-medium text-ink-2">
        Ora dell'avviso
        <HourSelect id="notify-hour" value={hour} onChange={setHour} />
      </label>
      <button type="button" onClick={() => void enable()} className={`${btn.primary} w-full`}><Bell size={17} />{sub ? 'Aggiorna orario' : 'Attiva notifiche'}</button>
      {sub && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => void test()} className={btn.secondary}><Send size={16} />Invia prova</button>
          <button type="button" onClick={() => void disable()} className={btn.secondary}><BellOff size={16} />Disattiva</button>
        </div>
      )}
      {msg && <p role="status" className="m-0 text-[14px] font-medium text-red-ink">{msg}</p>}
    </div>
  )
}
