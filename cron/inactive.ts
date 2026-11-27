/// <reference types="@cloudflare/workers-types" />
import { deleteAccount } from '../server/api'
import { sendPush, type PushEnv } from '../server/push'

// Account Google senza accessi da 24 mesi: avviso un mese prima (se ci sono notifiche), poi eliminazione (informativa).
// Gli ospiti li pulisce già il server quando la sessione scade.
const MONTH = 30 * 86_400_000
export const WARN_AFTER = 23 * MONTH
export const DELETE_AFTER = 24 * MONTH
const BATCH = 10 // pochi per giro: restano per la settimana dopo

export type InactiveEnv = PushEnv & { FILES: R2Bucket }

export const runInactive = async (env: InactiveEnv, now: number) => {
  const last = "COALESCE(seen_at, created_at)"
  const { results: warn } = await env.DB.prepare(
    `SELECT id FROM users WHERE id NOT LIKE 'guest-%' AND warned_at IS NULL AND ${last} < ? LIMIT ${BATCH}`,
  ).bind(now - WARN_AFTER).all<{ id: string }>()
  for (const { id } of warn) {
    const { results: subs } = await env.DB.prepare('SELECT endpoint, p256dh, auth FROM push_subs WHERE user_id = ?').bind(id).all<{ endpoint: string; p256dh: string; auth: string }>()
    for (const sub of subs)
      await sendPush(env, sub, { title: 'Il tuo garage verrà eliminato tra un mese', body: "Non apri Revkeeper da quasi due anni: aprila per tenere i dati." }).catch((e) => console.error(`Avviso inattività non inviato per ${id}`, e))
    await env.DB.prepare('UPDATE users SET warned_at = ? WHERE id = ?').bind(now, id).run()
  }
  // Eliminati solo dopo l'avviso (anche senza notifiche: l'avviso registra la data) e almeno 25 giorni dopo
  const { results: gone } = await env.DB.prepare(
    `SELECT id FROM users WHERE id NOT LIKE 'guest-%' AND ${last} < ?1 AND warned_at IS NOT NULL AND warned_at < ?2 LIMIT ${BATCH}`,
  ).bind(now - DELETE_AFTER, now - 25 * 86_400_000).all<{ id: string }>()
  for (const { id } of gone) await deleteAccount(env, id)
  return { warned: warn.length, deleted: gone.length }
}
