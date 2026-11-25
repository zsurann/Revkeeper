// Errori dell'app su Sentry (progetto "revkeeper"). Solo build pubblicate su Cloudflare Pages: in locale resta spento.
// Niente dati personali: né email, cookie, intestazioni, corpi delle richieste o parametri dell'URL.
// L'IP lo ricava Sentry dalla connessione: si spegne nelle impostazioni (Prevent Storing of IP Addresses).
import * as Sentry from '@sentry/react'

const env = import.meta.env.VITE_SENTRY_ENVIRONMENT // production (main), preview (altri rami), local

export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn || env === 'local') return
  Sentry.init({
    dsn,
    release: import.meta.env.VITE_SENTRY_RELEASE,
    environment: env,
    dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
    // Solo errori, niente tracing: pesava sull'avvio (Lighthouse: LCP da 2,2 a 2,8 s) per un'app così piccola
    // Rumore che non dipende dall'app: rete assente, estensioni del browser
    ignoreErrors: ['Failed to fetch', 'NetworkError when attempting to fetch resource.', 'Load failed', /^AbortError/],
    denyUrls: [/^chrome-extension:\/\//, /^moz-extension:\/\//, /^safari-web-extension:\/\//],
  })
}

// React 19: errori catturati dal Boundary e quelli non gestiti
export const reactErrorHandlers = {
  onUncaughtError: Sentry.reactErrorHandler(),
  onCaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
}
