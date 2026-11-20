// Verifica dell'ID token di Google Identity Services (RS256) con le chiavi pubbliche di Google
export type Jwk = JsonWebKey & { kid: string }
export type GoogleUser = { sub: string; email: string }

export class AuthError extends Error {}

const CERTS = 'https://www.googleapis.com/oauth2/v3/certs'
const ISSUERS = ['accounts.google.com', 'https://accounts.google.com']

const b64urlBytes = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
const b64urlJson = (s: string): unknown => {
  try {
    return JSON.parse(new TextDecoder().decode(b64urlBytes(s)))
  } catch {
    throw new AuthError('Token malformato')
  }
}

let cache: { keys: Jwk[]; until: number } | undefined
export const googleKeys = async (): Promise<Jwk[]> => {
  if (cache && cache.until > Date.now()) return cache.keys
  const res = await fetch(CERTS)
  if (!res.ok) throw new Error(`Chiavi Google non disponibili: ${res.status}`)
  const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get('cache-control') ?? '')?.[1] ?? 3600)
  cache = { keys: ((await res.json()) as { keys: Jwk[] }).keys, until: Date.now() + maxAge * 1000 }
  return cache.keys
}

export const verifyIdToken = async (
  token: string,
  clientId: string,
  getKeys: () => Promise<Jwk[]> = googleKeys,
  nowSec = Date.now() / 1000,
): Promise<GoogleUser> => {
  const [h, p, sig] = token.split('.')
  if (!h || !p || !sig) throw new AuthError('Token malformato')
  const header = b64urlJson(h) as { alg?: string; kid?: string }
  if (header.alg !== 'RS256') throw new AuthError('Algoritmo non ammesso')
  const jwk = (await getKeys()).find((k) => k.kid === header.kid)
  if (!jwk) throw new AuthError('Chiave sconosciuta')
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlBytes(sig), new TextEncoder().encode(`${h}.${p}`))
  if (!ok) throw new AuthError('Firma non valida')
  const c = b64urlJson(p) as { iss?: string; aud?: string; exp?: number; sub?: string; email?: string; email_verified?: boolean }
  if (!c.iss || !ISSUERS.includes(c.iss)) throw new AuthError('Emittente non valido')
  if (c.aud !== clientId) throw new AuthError('Destinatario non valido')
  if (!c.exp || c.exp < nowSec) throw new AuthError('Token scaduto')
  if (!c.sub || !c.email || c.email_verified !== true) throw new AuthError('Email non verificata')
  return { sub: c.sub, email: c.email }
}
