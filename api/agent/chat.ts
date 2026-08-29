import { handleAgentChat } from '../../server/agent/handler.ts'

/**
 * Production agent endpoint (Vercel serverless / any Node function host).
 * Set OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY in the host's env.
 */
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
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return {}
  }
}
