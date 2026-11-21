import { localParts, pushText, remindersFor, type Rec } from '../server/reminders'
import { sendPush, type PushEnv } from '../server/push'

// Piano gratuito: 50 subrequest per esecuzione; ne teniamo margine
const MAX_SENDS = 40

export const runReminders = async (env: PushEnv, now: Date) => {
  const { results: users } = await env.DB.prepare(
    'SELECT DISTINCT u.id, u.tz, u.notify_hour FROM users u JOIN push_subs p ON p.user_id = u.id WHERE u.notify_hour IS NOT NULL',
  ).all<{ id: string; tz: string; notify_hour: number }>()
  let sent = 0
  for (const u of users) {
    const { date, hour } = localParts(now, u.tz)
    if (hour !== u.notify_hour) continue
    const { results } = await env.DB.prepare(
      "SELECT kind, data FROM records WHERE user_id = ? AND deleted = 0 AND kind IN ('bikes','readings','items','services','documents')",
    ).bind(u.id).all<{ kind: string; data: string }>()
    const lines = remindersFor(results.map((r): Rec => ({ kind: r.kind, data: JSON.parse(r.data) })), date)
    if (lines.length === 0) continue
    const { results: subs } = await env.DB.prepare('SELECT endpoint, p256dh, auth FROM push_subs WHERE user_id = ?').bind(u.id).all<{ endpoint: string; p256dh: string; auth: string }>()
    for (const sub of subs) {
      if (sent >= MAX_SENDS) return console.warn(`Limite di ${MAX_SENDS} invii raggiunto, altri utenti rimandati`)
      // Una sola notifica al giorno per dispositivo, con tutte le scadenze del giorno
      await sendPush(env, sub, pushText(lines))
      sent++
    }
  }
}

export default {
  scheduled: (_: ScheduledController, env: PushEnv, ctx: ExecutionContext) => ctx.waitUntil(runReminders(env, new Date())),
}
