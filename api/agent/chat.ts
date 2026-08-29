/**
 * Production agent endpoint (Vercel serverless / any Node function host).
 * Set OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY in the host's env.
 */

// The model + tool loop can take a while; the platform default (10s on Vercel
// Hobby) is too short and surfaces to the client as a non-JSON gateway error.
export const maxDuration = 60

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
    // Imported lazily so a module-load failure (missing dep, bad resolution) is
    // caught here and returned as JSON instead of crashing the invocation.
    const { handleAgentChat } = await import('../../server/agent/handler')

    const auth = req.headers['authorization']
    const authHeader = Array.isArray(auth) ? auth[0] : auth
    const body =
      typeof req.body === 'string' ? safeParse(req.body) : (req.body ?? {})

    const result = await handleAgentChat(
      body,
      authHeader,
      process.env as Record<string, string | undefined>,
    )
    res.status(result.status).json(result.body)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[agent] invocation failed:', err)
    res.status(200).json({
      ok: false,
      error: 'server',
      message: `The assistant hit an error: ${message}`,
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
