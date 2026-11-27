/// <reference types="@cloudflare/workers-types" />
// Limiti di frequenza su D1: un contatore per chiave e finestra fissa. Un solo UPDATE ... RETURNING,
// quindi due richieste insieme non superano il tetto. Le finestre vecchie si cancellano strada facendo.
export const RATE = {
  login: { max: 20, seconds: 600 }, // per IP: tentativi di accesso con Google
  pushTest: { max: 5, seconds: 3600 }, // per utente: notifiche di prova
  upload: { max: 120, seconds: 3600 }, // per utente: file caricati
  sync: { max: 120, seconds: 3600 }, // per utente: lotti di sincronizzazione (il telefono ne manda pochi all'ora)
  syncIp: { max: 1500, seconds: 86_400 }, // per IP: tetto giornaliero, anche cambiando account ospite
} as const
export type RateName = keyof typeof RATE

export const hit = async (db: D1Database, name: RateName, who: string, nowMs = Date.now()) => {
  const { max, seconds } = RATE[name]
  const window = Math.floor(nowMs / 1000 / seconds) * seconds
  const key = `${name}:${who}`
  const row = await db
    .prepare('INSERT INTO rate_limits(key, window, count) VALUES (?1, ?2, 1) ON CONFLICT(key, window) DO UPDATE SET count = count + 1 RETURNING count')
    .bind(key, window)
    .first<{ count: number }>()
  if ((row?.count ?? 1) === 1) await db.prepare('DELETE FROM rate_limits WHERE window < ?').bind(window - 86_400).run()
  const ok = (row?.count ?? 1) <= max
  return { ok, retryAfter: ok ? 0 : window + seconds - Math.floor(nowMs / 1000) }
}

// IPv6: chi ha un /64 può cambiare indirizzo a piacere, quindi conta il prefisso; IPv4 resta intero
export const ipKey = (ip: string) => {
  if (!ip.includes(':')) return ip
  const [head = '', tail = ''] = ip.toLowerCase().split('::')
  const h = head ? head.split(':') : []
  const t = tail ? tail.split(':') : []
  const full = ip.includes('::') ? [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t] : h
  return `${full.slice(0, 4).map((x) => x.replace(/^0+(?=.)/, '')).join(':')}::/64`
}
