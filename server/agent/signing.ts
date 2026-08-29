import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Stateless signed tokens for the checkout flow. The serverless function keeps
 * no session — integrity of the order draft and the payment authorization is
 * carried in these HMAC-signed blobs instead.
 *
 * Format: base64url(JSON payload) + "." + base64url(HMAC-SHA256)
 */

const b64url = (buf: Buffer | string) =>
  Buffer.from(buf).toString('base64url')

export function sha256Hex(input: string): string {
  return createHmac('sha256', 'styleself-hash').update(input).digest('hex')
}

export function sign(payload: Record<string, unknown>, secret: string): string {
  const body = b64url(JSON.stringify(payload))
  const sig = createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verify<T = Record<string, unknown>>(
  token: string,
  secret: string,
): T | null {
  if (typeof token !== 'string' || !token.includes('.')) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null

  const expected = createHmac('sha256', secret).update(body).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  let payload: T & { exp?: number }
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  if (typeof payload.exp === 'number' && Date.now() > payload.exp) return null
  return payload
}
