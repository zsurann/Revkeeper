import { expect, it } from 'vitest'
import { AuthError, verifyIdToken, type Jwk } from './google'

const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')
const setup = async () => {
  const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']) as CryptoKeyPair
  const jwk = { ...(await crypto.subtle.exportKey('jwk', pair.publicKey)), kid: 'k1' } as Jwk
  const sign = async (claims: object, kid = 'k1') => {
    const head = `${enc({ alg: 'RS256', kid })}.${enc(claims)}`
    const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(head))
    return `${head}.${Buffer.from(sig).toString('base64url')}`
  }
  return { keys: async () => [jwk], sign }
}
const ok = { iss: 'https://accounts.google.com', aud: 'client', exp: 2000, sub: '42', email: 'a@b.it', email_verified: true }

it('accetta un token valido e rifiuta firma, aud, scadenza ed email non verificata', async () => {
  const { keys, sign } = await setup()
  await expect(verifyIdToken(await sign(ok), 'client', keys, 1000)).resolves.toEqual({ sub: '42', email: 'a@b.it' })
  await expect(verifyIdToken(await sign({ ...ok, aud: 'altro' }), 'client', keys, 1000)).rejects.toBeInstanceOf(AuthError)
  await expect(verifyIdToken(await sign(ok), 'client', keys, 3000)).rejects.toThrow('scaduto')
  await expect(verifyIdToken(await sign({ ...ok, email_verified: false }), 'client', keys, 1000)).rejects.toThrow('verificata')
  const forged = (await sign(ok)).replace(/\.[^.]+$/, '.' + Buffer.from('x'.repeat(256)).toString('base64url'))
  await expect(verifyIdToken(forged, 'client', keys, 1000)).rejects.toThrow('Firma')
  await expect(verifyIdToken(await sign(ok, 'k2'), 'client', keys, 1000)).rejects.toThrow('Chiave')
})
