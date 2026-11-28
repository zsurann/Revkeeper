import { localParts, pushText, remindAt, remindersFor, type Rec } from '../server/reminders'
import { QUOTA } from '../server/api'
import { sendPush, type PushEnv } from '../server/push'
import { runBackup, type BackupEnv } from './backup'
import { runInactive, type InactiveEnv } from './inactive'
import { monitored, type LiteEnv, type Monitor } from './sentryLite'

// Piano gratuito: 50 subrequest esterne per esecuzione (le notifiche; una va a Sentry), e 50 query D1.
// Il giro gira ogni 10 minuti e usa poche query fisse (un batch conta come una): utenti, record, iscrizioni, aggiornamento.
// Il server tiene per ogni utente l'istante del prossimo promemoria (remind_at): il giro legge solo chi è in scadenza,
// e chi non entra per il tetto resta in scadenza e passa davanti al giro successivo (ordine per remind_at).
export const MAX_SENDS = 40
const MAX_USERS = 40
// Recupero: chi è rimasto fuori alla sua ora (tetto raggiunto, giro del cron saltato) viene avvisato
// in una delle ore successive, non oltre questa finestra. Un solo avviso al giorno.
export const CATCH_UP_HOURS = 6

type Due = { id: string; tz: string; notify_hour: number; remind_at: number | null; last: number | null }
type Sub = { user_id: string; endpoint: string; p256dh: string; auth: string }

const doneStmt = (env: PushEnv, u: Due, now: Date, reminded: boolean) =>
  env.DB.prepare(`UPDATE users SET remind_at = ?1${reminded ? ', last_reminded_at = ?3' : ''} WHERE id = ?2`)
    .bind(remindAt(now.getTime(), u.tz, u.notify_hour, 1), u.id, ...(reminded ? [now.getTime()] : []))

const placeholders = (n: number, from = 1) => Array.from({ length: n }, (_, i) => `?${i + from}`).join(', ')

export const runReminders = async (env: PushEnv, now: Date) => {
  const { results: users } = await env.DB.prepare(
    `SELECT u.id AS id, u.tz AS tz, u.notify_hour AS notify_hour, u.remind_at AS remind_at, u.last_reminded_at AS last
     FROM users u
     WHERE u.notify_hour IS NOT NULL AND (u.remind_at IS NULL OR u.remind_at <= ?1)
       AND EXISTS (SELECT 1 FROM push_subs p WHERE p.user_id = u.id)
     ORDER BY COALESCE(u.remind_at, 0) ASC, u.id ASC
     LIMIT 200`,
  ).bind(now.getTime()).all<Due>()

  // 1. Chi è fuori tempo o già avvisato si sposta subito, senza occupare posti
  const updates: D1PreparedStatement[] = []
  const candidates: { u: Due; date: string }[] = []
  let overflow = false
  for (const u of users) {
    let due: number
    let date: string
    try {
      due = u.remind_at ?? remindAt(now.getTime(), u.tz, u.notify_hour, -1)
      date = localParts(new Date(due), u.tz).date
    } catch (e) {
      console.error(`Fuso non valido per ${u.id}`, e)
      continue
    }
    if (now.getTime() - due >= CATCH_UP_HOURS * 3_600_000 || (u.last != null && localParts(new Date(u.last), u.tz).date === date)) {
      updates.push(doneStmt(env, u, now, false))
      continue
    }
    if (candidates.length < MAX_USERS) candidates.push({ u, date })
    else overflow = true
  }
  if (overflow) console.error(`Promemoria: più di ${MAX_USERS} utenti in coda, altri rimandati al giro dopo`)

  // 2. Record e iscrizioni di tutti i candidati in due query
  const ids = candidates.map((c) => c.u.id)
  const recsBy = new Map<string, Rec[]>()
  const subsBy = new Map<string, Sub[]>()
  if (ids.length) {
    const { results } = await env.DB.prepare(
      `SELECT user_id, kind, data FROM records WHERE user_id IN (${placeholders(ids.length)}) AND deleted = 0 AND kind IN ('bikes','readings','items','services','documents')`,
    ).bind(...ids).all<{ user_id: string; kind: string; data: string | null }>()
    for (const r of results) {
      if (typeof r.data !== 'string') {
        console.error(`Record non leggibile per ${r.user_id} (${r.kind})`)
        continue
      }
      try {
        const list = recsBy.get(r.user_id) ?? []
        list.push({ kind: r.kind, data: JSON.parse(r.data) })
        recsBy.set(r.user_id, list)
      } catch (e) {
        console.error(`Record JSON non valido per ${r.user_id} (${r.kind})`, e)
      }
    }
    const { results: subs } = await env.DB.prepare(`SELECT user_id, endpoint, p256dh, auth FROM push_subs WHERE user_id IN (${placeholders(ids.length)})`)
      .bind(...ids).all<Sub>()
    for (const s of subs) subsBy.set(s.user_id, [...(subsBy.get(s.user_id) ?? []), s])
  }

  // 3. Chi riceve cosa, entro il tetto di invii; chi non entra resta in scadenza
  const outbox: { u: Due; sub: Sub; lines: string[] }[] = []
  let capped = false
  for (const { u, date } of candidates) {
    let lines: string[]
    try {
      lines = remindersFor(recsBy.get(u.id) ?? [], date)
    } catch (e) {
      console.error(`Promemoria non calcolabili per ${u.id}`, e)
      updates.push(doneStmt(env, u, now, true))
      continue
    }
    const subs = subsBy.get(u.id) ?? []
    if (lines.length && outbox.length + subs.length > MAX_SENDS) {
      capped = true
      continue
    }
    for (const sub of subs) if (lines.length) outbox.push({ u, sub, lines })
    updates.push(doneStmt(env, u, now, true))
  }
  if (capped) console.error(`Promemoria: limite di ${MAX_SENDS} invii raggiunto, altri utenti rimandati`)

  // 4. remind_at si sposta prima degli invii: un giro che muore a metà non blocca la coda per sempre
  if (updates.length) await env.DB.batch(updates)
  for (const { u, sub, lines } of outbox) {
    try {
      await sendPush(env, sub, pushText(lines))
    } catch (e) {
      console.error(`Invio non riuscito per ${u.id}`, e)
    }
  }
}

// Spazio vicino ai tetti del piano gratuito: un console.error diventa evento Sentry (avviso al titolare),
// e oltre l'80% il server smette di creare nuovi ospiti (flag letta da /auth/guest)
export const checkQuota = async (env: PushEnv, now = new Date()) => {
  const r = await env.DB.prepare('SELECT COALESCE(SUM(bytes), 0) AS b FROM users').all<{ b: number }>()
  const used = { db: (r.meta as { size_after?: number } | undefined)?.size_after ?? 0, files: r.results[0]?.b ?? 0 }
  let full = false
  for (const [k, max] of [['db', QUOTA.dbBytes], ['files', QUOTA.fileBytes]] as const)
    if (used[k] > 0.8 * max) {
      full = true
      console.error(`Quota ${k} oltre l'80%: ${Math.round(used[k] / 1048576)} MB su ${Math.round(max / 1048576)} MB (${now.toISOString().slice(0, 10)}), nuovi ospiti fermi`)
    }
  await env.DB.prepare("INSERT INTO flags(name, value) VALUES ('guests_closed', ?1) ON CONFLICT(name) DO UPDATE SET value = ?1").bind(full ? 1 : 0).run()
  return used
}

export const WEEKLY_CRON = '30 2 * * SUN' // domenica 03:30 in Italia d'inverno, 04:30 d'estate

// Ogni lavoro della domenica gira da solo: un errore (es. copia oltre i limiti) diventa evento Sentry e non ferma gli altri
const step = async <T>(name: string, run: () => Promise<T>) => {
  try {
    return await run()
  } catch (e) {
    console.error(`Giro settimanale, ${name} non riuscita`, e)
    return undefined
  }
}

type CronEnv = InactiveEnv & BackupEnv & LiteEnv
export const REMINDERS_CRON = '*/10 * * * *'
const HOURLY: Monitor = { slug: 'revkeeper-cron', schedule: REMINDERS_CRON, failureIssueThreshold: 3 }
const WEEKLY: Monitor = { slug: 'revkeeper-backup', schedule: WEEKLY_CRON, failureIssueThreshold: 1 }

// Due giri seguiti da un monitor Sentry ciascuno (avvisa se un giro salta o fallisce): promemoria ogni 10 minuti
// (con il controllo dello spazio una volta all'ora);
// la domenica copia di database e file e pulizia degli account inattivi
export default {
  scheduled: (controller, env, ctx) =>
    ctx.waitUntil(
      controller.cron === WEEKLY_CRON
        ? monitored(env, WEEKLY, async () => ({
            backup: await step('copia', () => runBackup(env, new Date())),
            inactive: await step('pulizia inattivi', () => runInactive(env, Date.now())),
            quota: await step('quota', () => checkQuota(env)),
          }))
        : monitored(env, HOURLY, async () => {
            const now = new Date()
            await runReminders(env, now)
            if (now.getUTCMinutes() < 10) await checkQuota(env, now)
          }),
    ),
} satisfies ExportedHandler<CronEnv>
