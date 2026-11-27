import { localParts, pushText, remindAt, remindersFor, type Rec } from '../server/reminders'
import { QUOTA } from '../server/api'
import { sendPush, type PushEnv } from '../server/push'
import { runBackup, type BackupEnv } from './backup'
import { runInactive, type InactiveEnv } from './inactive'
import { monitored, type LiteEnv, type Monitor } from './sentryLite'

// Piano gratuito: 50 subrequest per esecuzione; ne teniamo margine.
// Il server tiene per ogni utente l'istante del prossimo promemoria (remind_at): il giro legge solo chi è in scadenza,
// e chi non entra per il tetto resta in scadenza e passa davanti al giro successivo.
export const MAX_SENDS = 40
const MAX_USERS = 40
// Recupero: chi è rimasto fuori alla sua ora (tetto raggiunto, giro del cron saltato) viene avvisato
// in una delle ore successive, non oltre questa finestra. Un solo avviso al giorno.
export const CATCH_UP_HOURS = 6

const done = (env: PushEnv, u: { id: string; tz: string; notify_hour: number }, now: Date, reminded: boolean) =>
  env.DB.prepare(`UPDATE users SET remind_at = ?1${reminded ? ', last_reminded_at = ?3' : ''} WHERE id = ?2`)
    .bind(remindAt(now.getTime(), u.tz, u.notify_hour, 1), u.id, ...(reminded ? [now.getTime()] : []))
    .run()

export const runReminders = async (env: PushEnv, now: Date) => {
  const { results: users } = await env.DB.prepare(
    `SELECT u.id AS id, u.tz AS tz, u.notify_hour AS notify_hour, u.remind_at AS remind_at, u.last_reminded_at AS last
     FROM users u
     WHERE u.notify_hour IS NOT NULL AND (u.remind_at IS NULL OR u.remind_at <= ?1)
       AND EXISTS (SELECT 1 FROM push_subs p WHERE p.user_id = u.id)
     ORDER BY COALESCE(u.remind_at, 0) ASC, u.id ASC
     LIMIT 200`,
  ).bind(now.getTime()).all<{ id: string; tz: string; notify_hour: number; remind_at: number | null; last: number | null }>()
  let sent = 0
  let seen = 0
  for (const u of users) {
    if (sent >= MAX_SENDS || seen >= MAX_USERS) {
      console.warn(`Limite di ${MAX_SENDS} invii raggiunto, altri utenti rimandati`)
      return
    }
    let due: number
    let date: string
    try {
      due = u.remind_at ?? remindAt(now.getTime(), u.tz, u.notify_hour, -1)
      date = localParts(new Date(due), u.tz).date
    } catch (e) {
      console.error(`Fuso non valido per ${u.id}`, e)
      continue
    }
    // Troppo tardi o già avvisato quel giorno: si passa al prossimo, senza occupare posti del giro
    if (now.getTime() - due >= CATCH_UP_HOURS * 3_600_000 || (u.last != null && localParts(new Date(u.last), u.tz).date === date)) {
      await done(env, u, now, false)
      continue
    }
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
      await done(env, u, now, true)
      continue
    }
    if (lines.length === 0) {
      await done(env, u, now, true)
      continue
    }
    const { results: subs } = await env.DB.prepare('SELECT endpoint, p256dh, auth FROM push_subs WHERE user_id = ?').bind(u.id).all<{ endpoint: string; p256dh: string; auth: string }>()
    if (sent + subs.length > MAX_SENDS) {
      console.warn(`Limite di ${MAX_SENDS} invii raggiunto, altri utenti rimandati`)
      return
    }
    for (const sub of subs) {
      try {
        await sendPush(env, sub, pushText(lines))
      } catch (e) {
        console.error(`Invio non riuscito per ${u.id}`, e)
      }
      sent++
    }
    await done(env, u, now, true)
  }
}

// Spazio vicino ai tetti del piano gratuito: un console.error diventa evento Sentry (avviso al titolare)
export const checkQuota = async (env: PushEnv, now = new Date()) => {
  const r = await env.DB.prepare('SELECT COALESCE(SUM(bytes), 0) AS b FROM users').all<{ b: number }>()
  const used = { db: (r.meta as { size_after?: number } | undefined)?.size_after ?? 0, files: r.results[0]?.b ?? 0 }
  for (const [k, max] of [['db', QUOTA.dbBytes], ['files', QUOTA.fileBytes]] as const)
    if (used[k] > 0.8 * max) console.error(`Quota ${k} oltre l'80%: ${Math.round(used[k] / 1048576)} MB su ${Math.round(max / 1048576)} MB (${now.toISOString().slice(0, 10)})`)
  return used
}

export const WEEKLY_CRON = '30 2 * * 0' // domenica 03:30 in Italia d'inverno, 04:30 d'estate

type CronEnv = InactiveEnv & BackupEnv & LiteEnv
const HOURLY: Monitor = { slug: 'revkeeper-cron', schedule: '0 * * * *', failureIssueThreshold: 2 }
const WEEKLY: Monitor = { slug: 'revkeeper-backup', schedule: WEEKLY_CRON, failureIssueThreshold: 1 }

// Due giri seguiti da un monitor Sentry ciascuno (avvisa se un giro salta o fallisce): promemoria ogni ora;
// la domenica copia di database e file e pulizia degli account inattivi
export default {
  scheduled: (controller, env, ctx) =>
    ctx.waitUntil(
      controller.cron === WEEKLY_CRON
        ? monitored(env, WEEKLY, async () => ({ backup: await runBackup(env, new Date()), inactive: await runInactive(env, Date.now()), quota: await checkQuota(env) }))
        : monitored(env, HOURLY, () => runReminders(env, new Date())),
    ),
} satisfies ExportedHandler<CronEnv>
