/// <reference types="@cloudflare/workers-types" />
// Opzioni Sentry comuni a API (Pages Functions) e cron (progetto "revkeeper-api").
// Gli errori del server finora finivano solo nei log: console.error diventa un evento su Sentry.
// Niente dati personali: né utente né IP, cookie, intestazioni (c'è il cookie di sessione), corpi
// (c'è il token di Google) o parametri dell'URL. L'IP lo ricava Sentry dalla connessione: va spento
// nelle impostazioni dell'organizzazione (Security & Privacy → Prevent Storing of IP Addresses).
import { captureConsoleIntegration, type CloudflareOptions } from '@sentry/cloudflare'

export type SentryEnv = { SENTRY_DSN?: string; SENTRY_ENVIRONMENT?: string; SENTRY_RELEASE?: string }

export const sentryOptions = (env: SentryEnv): CloudflareOptions => ({
  dsn: env.SENTRY_DSN,
  enabled: !!env.SENTRY_DSN,
  environment: env.SENTRY_ENVIRONMENT ?? 'production',
  release: env.SENTRY_RELEASE, // API: commit da Cloudflare Pages. Cron: se manca, l'SDK usa la versione del Worker
  dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
  integrations: [captureConsoleIntegration({ levels: ['error'] })],
  tracesSampleRate: 0.05,
  beforeSend: (e) => { delete e.user; if (e.request) delete e.request.headers; return e }, // niente IP né user-agent
})
