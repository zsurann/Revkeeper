// Errori dell'app su Sentry (progetto "revkeeper"). Solo build pubblicate su Cloudflare Pages: in locale resta spento.
// Niente dati personali: né email, cookie, intestazioni, corpi delle richieste o parametri dell'URL.
// L'IP lo ricava Sentry dalla connessione: si spegne nelle impostazioni (Prevent Storing of IP Addresses).
import * as Sentry from '@sentry/react'
import { EMAIL, mailto } from './contact'

const env = import.meta.env.VITE_SENTRY_ENVIRONMENT // production (main), preview (altri rami), local

export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn || env === 'local') return
  Sentry.init({
    dsn,
    release: import.meta.env.VITE_SENTRY_RELEASE,
    environment: env,
    dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
    // Solo errori: niente tracing e niente sessioni (la sessione partiva con una richiesta a Sentry all'avvio,
    // e Lighthouse la contava nel percorso critico: LCP da 2,2 a 2,7 s)
    integrations: (defaults) => defaults.filter((i) => i.name !== 'BrowserSession'),
    // Rumore che non dipende dall'app: rete assente, estensioni del browser
    ignoreErrors: ['Failed to fetch', 'NetworkError when attempting to fetch resource.', 'Load failed', /^AbortError/],
    denyUrls: [/^chrome-extension:\/\//, /^moz-extension:\/\//, /^safari-web-extension:\/\//],
    // Niente IP né dati del dispositivo nei report (informativa): via utente e intestazioni della richiesta
    beforeSend: (e) => { delete e.user; if (e.request) delete e.request.headers; return e },
  })
}

// React 19: errori catturati dal Boundary e quelli non gestiti
export const reactErrorHandlers = {
  onUncaughtError: Sentry.reactErrorHandler(),
  onCaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
}

// Se un componente si rompe, al posto dello schermo bianco: messaggio e ricarica. I dati restano sul telefono.
const Fallback = () => (
  <main role="alert" className="mx-auto grid min-h-dvh max-w-[420px] content-center gap-4 px-6 text-center">
    <h1 className="t-title m-0 text-[22px]">Qualcosa non ha funzionato</h1>
    <p className="m-0 text-[15px] text-ink-2">I tuoi dati sono al sicuro sul telefono. Ricarica l'app per continuare.</p>
    <button type="button" onClick={() => location.reload()} className="h-12 rounded-full bg-ink px-6 font-semibold text-bg">Ricarica</button>
    {EMAIL && <a href={mailto('Revkeeper: segnalazione errore', `\nCodice errore: ${Sentry.lastEventId() ?? '—'}`)} className="text-[15px] font-semibold text-ink-2 underline underline-offset-2">Segnala il problema</a>}
  </main>
)
export const Guard = ({ children }: { children: React.ReactNode }) => <Sentry.ErrorBoundary fallback={<Fallback />}>{children}</Sentry.ErrorBoundary>
