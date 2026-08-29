import { handleAgentChat } from './handler'

/**
 * Source for the Vercel serverless function. `npm run build:fn` bundles this
 * (with all of server/agent/*) into `api/agent/chat.js`, which is what Vercel
 * actually deploys — Vercel's per-file TS transpile does not follow imports out
 * of the `api/` directory, so the function has to be pre-bundled.
 *
 * Env: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY.
 */

// Model + tool loop can exceed the 10s platform default (Vercel Hobby).
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
