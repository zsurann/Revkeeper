import { useEffect, useRef, useState } from 'react'
import { getMeta } from './db'
import { logout, startAccount, syncNow } from './sync'
import { Screen, ghost, primary } from './ui'

type Gis = {
  accounts: {
    id: {
      initialize: (o: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string }) => void
      renderButton: (el: HTMLElement, o: Record<string, string | number>) => void
    }
  }
}
declare global { interface Window { google?: Gis } }

const loadGis = () =>
  new Promise<Gis>((resolve, reject) => {
    if (window.google) return resolve(window.google)
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.onload = () => (window.google ? resolve(window.google) : reject(new Error('Google non disponibile')))
    s.onerror = () => reject(new Error('Non riesco a caricare Google: controlla la connessione'))
    document.head.append(s)
  })

const ago = (ms?: number) => (ms ? new Date(ms).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }) : 'mai')

export const Account = ({ onClose }: { onClose: () => void }) => {
  const [email, setEmail] = useState<string>()
  const [lastSync, setLastSync] = useState<number>()
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const btn = useRef<HTMLDivElement>(null)

  const refresh = async () => {
    setEmail(await getMeta<string>('account'))
    setLastSync(await getMeta<number>('lastSync'))
  }
  useEffect(() => void refresh(), [])

  useEffect(() => {
    if (email || !btn.current) return
    const el = btn.current
    loadGis()
      .then((g) => {
        g.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: async ({ credential }) => {
            setBusy(true)
            try {
              const res = await fetch('/api/auth/google', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ credential }) })
              const body = (await res.json()) as { email?: string; error?: string }
              if (!res.ok || !body.email) throw new Error(body.error ?? 'Accesso non riuscito')
              await startAccount(body.email)
              setMsg('Dati sincronizzati')
            } catch (e) {
              setMsg(e instanceof Error ? e.message : 'Accesso non riuscito')
            } finally {
              setBusy(false)
              void refresh()
            }
          },
        })
        g.accounts.id.renderButton(el, { theme: 'filled_black', size: 'large', shape: 'pill', text: 'continue_with', locale: 'it', width: 280 })
      })
      .catch((e: Error) => setMsg(e.message))
  }, [email])

  const sync = async () => {
    setBusy(true)
    try {
      await syncNow()
      setMsg('Sincronizzato')
    } catch (e) {
      setMsg(e instanceof Error ? `Sync non riuscito: ${e.message}` : 'Sync non riuscito')
    } finally {
      setBusy(false)
      void refresh()
    }
  }

  return (
    <Screen>
      <header className="flex items-center justify-between">
        <h1 className="font-gauge text-2xl">Account</h1>
        <button onClick={onClose} className={ghost}>Chiudi</button>
      </header>
      {email ? (
        <section className="grid gap-3 rounded-panel bg-panel p-4">
          <p className="m-0">Accesso con <b>{email}</b></p>
          <p className="m-0 text-sm text-dim">Ultima sincronizzazione: {ago(lastSync)}</p>
          <button onClick={() => void sync()} disabled={busy} className={primary}>Sincronizza ora</button>
          <button onClick={() => void logout().then(refresh)} className={`justify-self-start ${ghost}`}>Esci</button>
          <p className="m-0 text-xs text-dim">Uscendo, i dati restano su questo telefono ma smettono di sincronizzarsi.</p>
        </section>
      ) : (
        <section className="grid gap-3 rounded-panel bg-panel p-4">
          <p className="m-0">Accedi per salvare il garage online e usarlo su più telefoni. Senza accesso l'app funziona lo stesso, solo su questo dispositivo.</p>
          {/* stesso color-scheme dell'iframe di Google, altrimenti il browser gli dipinge dietro un fondo bianco */}
          <div ref={btn} className="min-h-11 [color-scheme:light]" />
        </section>
      )}
      {msg && <p role="status" className="m-0 text-sm text-dim">{busy ? 'Attendi…' : msg}</p>}
    </Screen>
  )
}
