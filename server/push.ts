/// <reference types="@cloudflare/workers-types" />
import { buildPushPayload } from '@block65/webcrypto-web-push'

export type PushEnv = { DB: D1Database; VAPID_PUBLIC_KEY: string; VAPID_PRIVATE_KEY: string; VAPID_SUBJECT: string }
type Sub = { endpoint: string; p256dh: string; auth: string }

// Invia una notifica; una subscription scaduta (404/410) viene eliminata
export const sendPush = async (env: PushEnv, sub: Sub, msg: { title: string; body: string; url?: string }) => {
  const payload = await buildPushPayload(
    { data: JSON.stringify(msg), options: { ttl: 12 * 3600, urgency: 'normal' } },
    { endpoint: sub.endpoint, expirationTime: null, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    { subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY },
  )
  const res = await fetch(sub.endpoint, payload)
  if (res.status === 404 || res.status === 410) await env.DB.prepare('DELETE FROM push_subs WHERE endpoint = ?').bind(sub.endpoint).run()
  return res.status
}
