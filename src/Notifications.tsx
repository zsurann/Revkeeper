import { useEffect, useState } from 'react'
import { ghost, primary, field } from './ui'

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
  const reg = await navigator.serviceWorker.ready
  const s = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key() }))
  await post('subscribe', { subscription: s.toJSON(), hour, tz: Intl.DateTimeFormat().resolvedOptions().timeZone })
  return s
}

export const Notifications = () => {
  const [sub, setSub] = useState<PushSubscription | null>()
  const [hour, setHour] = useState(9)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (pushSupported()) void navigator.serviceWorker.ready.then((r) => r.pushManager.getSubscription()).then(setSub)
  }, [])

  if (!pushSupported())
    return (
      <p className="m-0 text-sm text-dim">
        Questo browser non riceve notifiche. Su iPhone: Condividi → "Aggiungi alla schermata Home", poi apri Revkeeper da lì.
      </p>
    )

  const enable = async () => {
    try {
      setSub(await enablePush(hour))
      setMsg(`Notifiche attive alle ${hour}:00`)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Attivazione non riuscita')
    }
  }
  const disable = async () => {
    if (!sub) return
    await post('unsubscribe', { endpoint: sub.endpoint }).catch(() => undefined)
    await sub.unsubscribe()
    setSub(null)
    setMsg('Notifiche disattivate')
  }
  const test = async () => {
    try {
      const r = await post('test', {})
      setMsg(r.sent ? 'Notifica di prova inviata' : 'Nessun dispositivo raggiunto')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Invio non riuscito')
    }
  }

  return (
    <section className="grid gap-3 rounded-panel bg-panel p-4">
      <b className="font-gauge text-lg">Notifiche</b>
      <p className="m-0 text-sm text-dim">Un avviso al giorno quando una scadenza è a 30 giorni, a 7 giorni o oggi, e se non aggiorni i km da 30 giorni.</p>
      <label className="grid gap-1 text-sm text-dim">
        Ora dell'avviso
        <select id="notify-hour" value={hour} onChange={(e) => setHour(Number(e.target.value))} className={field}>
          {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{`${h}:00`}</option>)}
        </select>
      </label>
      <button onClick={() => void enable()} className={primary}>{sub ? 'Aggiorna orario' : 'Attiva notifiche'}</button>
      {sub && (
        <div className="flex gap-2">
          <button onClick={() => void test()} className={ghost}>Invia prova</button>
          <button onClick={() => void disable()} className={ghost}>Disattiva</button>
        </div>
      )}
      {msg && <p role="status" className="m-0 text-sm text-dim">{msg}</p>}
    </section>
  )
}
