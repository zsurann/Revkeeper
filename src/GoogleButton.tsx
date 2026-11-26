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

// Lo script di Google si carica una volta sola (prima veniva aggiunto a ogni pulsante montato, anche due volte
// in sviluppo) e initialize() si chiama una volta: Google avvisa che chiamate ripetute danno risultati imprevisti.
let gis: Promise<Gis> | undefined
const loadGis = () =>
  (gis ??= new Promise<Gis>((resolve, reject) => {
    if (window.google) return resolve(window.google)
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.onload = () => (window.google ? resolve(window.google) : reject(new Error('Google non disponibile')))
    s.onerror = () => {
      gis = undefined // senza rete: al prossimo tentativo si riprova
      s.remove()
      reject(new Error('Non riesco a caricare Google: controlla la connessione'))
    }
    document.head.append(s)
  }))

type Handlers = { onDone: (error?: string) => void; onBusy?: (busy: boolean) => void }
let active: Handlers | undefined // il pulsante montato per ultimo riceve l'esito
let initialized = false
const onCredential = async ({ credential }: { credential: string }) => {
  const h = active
  h?.onBusy?.(true)
  try {
    const res = await fetch('/api/auth/google', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ credential }) })
    const body = (await res.json().catch(() => ({}))) as { email?: string; error?: string }
    if (!res.ok || !body.email) throw new Error(body.error ?? 'Accesso non riuscito')
    await startAccount(body.email)
    h?.onDone()
  } catch (e) {
    h?.onDone(e instanceof Error ? e.message : 'Accesso non riuscito')
  } finally {
    h?.onBusy?.(false)
  }
}

// Pulsante ufficiale "Continua con Google": verifica il token sul server e avvia la sincronizzazione.
// onDone riceve il messaggio d'errore, o niente se l'accesso è riuscito.
export const GoogleButton = ({ onDone, onBusy }: { onDone: (error?: string) => void; onBusy?: (busy: boolean) => void }) => {
  const btn = useRef<HTMLDivElement>(null)
  const cb = useRef<Handlers>({ onDone, onBusy })
  cb.current = { onDone, onBusy }
  useEffect(() => {
    const el = btn.current
    if (!el) return
    const mine: Handlers = { onDone: (e) => cb.current.onDone(e), onBusy: (b) => cb.current.onBusy?.(b) }
    active = mine
    let alive = true
    // Iframe di Google dopo la transizione di pagina (~350 ms): caricato durante lo scorrimento lo faceva scattare
    new Promise((r) => setTimeout(r, 380))
      .then(loadGis)
      .then((g) => {
        if (!alive) return
        if (!initialized) {
          g.accounts.id.initialize({ client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID, callback: (r) => void onCredential(r) })
          initialized = true
        }
        g.accounts.id.renderButton(el, { theme: document.documentElement.classList.contains('dark') ? 'filled_black' : 'outline', size: 'large', shape: 'pill', text: 'continue_with', locale: 'it', width: 280 })
      })
      .catch((e: Error) => { if (alive) cb.current.onDone(e.message) })
    return () => {
      alive = false
      if (active === mine) active = undefined
    }
  }, [])
  // stesso color-scheme dell'iframe di Google, altrimenti il browser gli dipinge dietro un fondo bianco
  return <div ref={btn} className="min-h-11 [color-scheme:light]" />
}
