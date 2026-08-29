import { handleCheckout } from './checkout'

/**
 * Vercel serverless entry for the deterministic checkout endpoint.
 * Bundled by `npm run build:fn` to `api/agent/checkout.js`.
 */
export const maxDuration = 30

export default async function handler(
  req: {
    method?: string
    body?: unknown
    headers: Record<string, string | string[] | undefined>
  },
  res: {
    status: (code: number) => { json: (data: unknown) => void }
  },
) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'bad_request', message: 'POST only.' })
    return
  }

  try {
    const auth = req.headers['authorization']
    const authHeader = Array.isArray(auth) ? auth[0] : auth
    const body =
      typeof req.body === 'string' ? safeParse(req.body) : (req.body ?? {})

    const result = await handleCheckout(
      body,
      authHeader,
      process.env as Record<string, string | undefined>,
    )
    res.status(result.status).json(result.body)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[agent-checkout] invocation failed:', err)
    res.status(200).json({
      ok: false,
      error: 'server',
      message: `Checkout hit an error: ${message}`,
    })
  }
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return {}
  }
}
