import { localParts, pushText, remindersFor, type Rec } from '../server/reminders'
import * as Sentry from '@sentry/cloudflare'
import { sendPush, type PushEnv } from '../server/push'
import { sentryOptions, type SentryEnv } from '../server/sentry'

// Piano gratuito: 50 subrequest per esecuzione; ne teniamo margine.
// Chi non entra in questo giro resta in coda (last_reminded_at) e passa davanti all'ora successiva.
export const MAX_SENDS = 40
const MAX_USERS = 40
// Recupero: chi è rimasto fuori alla sua ora (tetto raggiunto, giro del cron saltato) viene avvisato
// in una delle ore successive dello stesso giorno, non oltre questa finestra. Un solo avviso al giorno.
export const CATCH_UP_HOURS = 6

const mark = (env: PushEnv, id: string, now: Date) =>
  env.DB.prepare('UPDATE users SET last_reminded_at = ? WHERE id = ?').bind(now.getTime(), id).run()

export const runReminders = async (env: PushEnv, now: Date) => {
  const { results: users } = await env.DB.prepare(
    `SELECT u.id AS id, u.tz AS tz, u.notify_hour AS notify_hour, u.last_reminded_at AS last
     FROM users u
     WHERE u.notify_hour IS NOT NULL
       AND EXISTS (SELECT 1 FROM push_subs p WHERE p.user_id = u.id)
     ORDER BY (u.last_reminded_at IS NULL) DESC, u.last_reminded_at ASC, u.id ASC`,
  ).all<{ id: string; tz: string; notify_hour: number; last: number | null }>()
  let sent = 0
  let seen = 0
  for (const u of users) {
    if (sent >= MAX_SENDS || seen >= MAX_USERS) {
      console.warn(`Limite di ${MAX_SENDS} invii raggiunto, altri utenti rimandati`)
      return
    }
    let date: string
    let hour: number
    try {
      ;({ date, hour } = localParts(now, u.tz))
    } catch (e) {
      console.error(`Fuso non valido per ${u.id}`, e)
      continue
    }
    const late = hour - u.notify_hour
    if (late < 0 || late >= CATCH_UP_HOURS) continue
    if (u.last != null && localParts(new Date(u.last), u.tz).date === date) continue // già avvisato oggi
    seen++
    const { results } = await env.DB.prepare(
      "SELECT kind, data FROM records WHERE user_id = ? AND deleted = 0 AND kind IN ('bikes','readings','items','services','documents')",
    ).bind(u.id).all<{ kind: string; data: string | null }>()
    const recs: Rec[] = []
    for (const r of results) {
      if (typeof r.data !== 'string') {
        console.error(`Record non leggibile per ${u.id} (${r.kind})`)
        continue
      }
      try {
        recs.push({ kind: r.kind, data: JSON.parse(r.data) })
      } catch (e) {
        console.error(`Record JSON non valido per ${u.id} (${r.kind})`, e)
      }
    }
    let lines: string[]
    try {
      lines = remindersFor(recs, date)
    } catch (e) {
      console.error(`Promemoria non calcolabili per ${u.id}`, e)
      await mark(env, u.id, now)
      continue
    }
    if (lines.length === 0) {
      await mark(env, u.id, now)
      continue
    }
    const { results: subs } = await env.DB.prepare('SELECT endpoint, p256dh, auth FROM push_subs WHERE user_id = ?').bind(u.id).all<{ endpoint: string; p256dh: string; auth: string }>()
    let complete = true
    for (const sub of subs) {
      if (sent >= MAX_SENDS) {
        complete = false
        break
      }
      try {
        await sendPush(env, sub, pushText(lines))
      } catch (e) {
        console.error(`Invio non riuscito per ${u.id}`, e)
      }
      sent++
    }
    if (!complete) {
      console.warn(`Limite di ${MAX_SENDS} invii raggiunto, altri utenti rimandati`)
      return
    }
    await mark(env, u.id, now)
  }
}

// Sentry segue il giro orario: errori, e un monitor del cron che avvisa se un giro salta o fallisce
export default Sentry.withSentry<PushEnv & SentryEnv>((env) => sentryOptions(env), {
  scheduled: (_, env, ctx) =>
    ctx.waitUntil(
      Sentry.withMonitor('revkeeper-cron', () => runReminders(env, new Date()), {
        schedule: { type: 'crontab', value: '0 * * * *' },
        checkinMargin: 10,
        maxRuntime: 5,
        timezone: 'Etc/UTC',
      }),
    ),
} satisfies ExportedHandler<PushEnv & SentryEnv>)
