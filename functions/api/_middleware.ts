import { AsyncLocalStorage } from 'node:async_hooks'
import type { Env } from '../../server/api'
import { errorEnvelope } from '../../cron/sentryLite'

// Errori delle richieste /api su Sentry senza SDK: l'SDK completo costava ~7 ms di CPU a richiesta (limite 10 ms),
// misurato il 28/11/2026. I console.error di una richiesta diventano un solo evento, inviato dopo la risposta.
// Niente dati personali: né utente né IP, cookie, intestazioni o corpi; solo metodo, percorso e messaggi.
// Sta in functions/api/ e non nella radice: un middleware nella radice farebbe passare dal Worker anche ogni file statico.
type MwEnv = Env & { SENTRY_DSN?: string; SENTRY_ENVIRONMENT?: string; CF_PAGES_BRANCH?: string; CF_PAGES_COMMIT_SHA?: string }

const sink = new AsyncLocalStorage<string[]>()
const original = console.error
console.error = (...a: unknown[]) => {
  sink.getStore()?.push(a.map((x) => (x instanceof Error ? `${x.name}: ${x.message}` : String(x))).join(' '))
  original(...a)
}

// Al massimo 20 eventi al minuto per isolate: un guasto che fa fallire ogni richiesta non esaurisce la quota di Sentry
let windowStart = 0
let sent = 0
const budget = (now = Date.now()) => {
  if (now - windowStart > 60_000) [windowStart, sent] = [now, 0]
  return ++sent <= 20
}

export const onRequest: PagesFunction<MwEnv> = (ctx) => {
  const errors: string[] = []
  return sink.run(errors, async () => {
    try {
      return await ctx.next()
    } catch (e) {
      console.error(e)
      throw e
    } finally {
      const { SENTRY_DSN: dsn, SENTRY_ENVIRONMENT, CF_PAGES_BRANCH: branch, CF_PAGES_COMMIT_SHA: release } = ctx.env
      if (dsn && errors.length && budget()) {
        const env = SENTRY_ENVIRONMENT ?? (branch && branch !== 'main' ? 'preview' : 'production')
        const where = `${ctx.request.method} ${new URL(ctx.request.url).pathname.replace(/[0-9a-f-]{36}/g, ':id')}`
        const { url, body } = errorEnvelope(dsn, `api ${where}`, errors, env, release)
        ctx.waitUntil(fetch(url, { method: 'POST', body, headers: { 'content-type': 'application/x-sentry-envelope' } }).catch(() => undefined))
      }
    }
  })
}
