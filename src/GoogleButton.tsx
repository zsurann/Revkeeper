import { useEffect, useRef } from 'react'
import { startAccount } from './sync'

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

// Pulsante ufficiale "Continua con Google": verifica il token sul server e avvia la sincronizzazione.
// onDone riceve il messaggio d'errore, o niente se l'accesso è riuscito.
export const GoogleButton = ({ onDone, onBusy }: { onDone: (error?: string) => void; onBusy?: (busy: boolean) => void }) => {
  const btn = useRef<HTMLDivElement>(null)
  const cb = useRef({ onDone, onBusy })
  cb.current = { onDone, onBusy }
  useEffect(() => {
    const el = btn.current
    if (!el) return
    loadGis()
      .then((g) => {
        g.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: async ({ credential }) => {
            cb.current.onBusy?.(true)
            try {
              const res = await fetch('/api/auth/google', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ credential }) })
              const body = (await res.json()) as { email?: string; error?: string }
              if (!res.ok || !body.email) throw new Error(body.error ?? 'Accesso non riuscito')
              await startAccount(body.email)
              cb.current.onDone()
            } catch (e) {
              cb.current.onDone(e instanceof Error ? e.message : 'Accesso non riuscito')
            } finally {
              cb.current.onBusy?.(false)
            }
          },
        })
        g.accounts.id.renderButton(el, { theme: 'filled_black', size: 'large', shape: 'pill', text: 'continue_with', locale: 'it', width: 280 })
      })
      .catch((e: Error) => cb.current.onDone(e.message))
  }, [])
  // stesso color-scheme dell'iframe di Google, altrimenti il browser gli dipinge dietro un fondo bianco
  return <div ref={btn} className="min-h-11 [color-scheme:light]" />
}
