// Sentry nel cron senza SDK: inizializzare l'SDK costava ~10 ms di CPU a giro (oltre il tetto del piano gratuito).
// Un solo invio a fine giro (envelope): check-in del monitor e, se ci sono stati errori, un evento che li riassume.
// Niente dati personali: gli errori del cron citano solo id interni.
export type LiteEnv = { SENTRY_DSN?: string; SENTRY_ENVIRONMENT?: string; CF_VERSION_METADATA?: { id: string } }
export type Monitor = { slug: string; schedule: string; failureIssueThreshold: number }

export const envelopeFor = (
  dsn: string,
  m: Monitor,
  status: 'ok' | 'error',
  errors: string[],
  ms: number,
  env: string,
  release?: string,
) => {
  const u = new URL(dsn)
  const url = `https://${u.host}/api${u.pathname}/envelope/?sentry_key=${u.username}&sentry_version=7`
  const items = [
    { type: 'check_in' },
    {
      check_in_id: crypto.randomUUID().replace(/-/g, ''),
      monitor_slug: m.slug,
      status,
      duration: ms / 1000,
      environment: env,
      release,
      monitor_config: {
        schedule: { type: 'crontab', value: m.schedule },
        checkin_margin: 10, max_runtime: 5, timezone: 'Etc/UTC', failure_issue_threshold: m.failureIssueThreshold, recovery_threshold: 1,
      },
    },
  ]
  if (errors.length)
    items.push({ type: 'event' }, {
      event_id: crypto.randomUUID().replace(/-/g, ''),
      timestamp: Date.now() / 1000,
      platform: 'javascript',
      level: 'error',
      environment: env,
      release,
      tags: { monitor: m.slug },
      message: { formatted: `${m.slug}: ${errors.length} errori. ${errors.slice(0, 5).join(' | ')}`.slice(0, 2000) },
    } as never)
  return { url, body: [JSON.stringify({ sent_at: new Date().toISOString() }), ...items.map((i) => JSON.stringify(i))].join('\n') }
}

// Esegue il giro raccogliendo i console.error; un'eccezione chiude il check-in come "error" e viene rilanciata
export const monitored = async <T>(env: LiteEnv, m: Monitor, run: () => Promise<T>): Promise<T> => {
  const errors: string[] = []
  const original = console.error
  console.error = (...a: unknown[]) => {
    errors.push(a.map((x) => (x instanceof Error ? `${x.name}: ${x.message}` : String(x))).join(' '))
    original(...a)
  }
  const t0 = Date.now()
  let status: 'ok' | 'error' = 'ok'
  try {
    return await run()
  } catch (e) {
    status = 'error'
    errors.unshift(e instanceof Error ? `${e.name}: ${e.message}` : String(e))
    throw e
  } finally {
    console.error = original
    if (env.SENTRY_DSN) {
      const { url, body } = envelopeFor(env.SENTRY_DSN, m, status, errors, Date.now() - t0, env.SENTRY_ENVIRONMENT ?? 'production', env.CF_VERSION_METADATA?.id)
      await fetch(url, { method: 'POST', body, headers: { 'content-type': 'application/x-sentry-envelope' } }).catch(() => undefined)
    }
  }
}
