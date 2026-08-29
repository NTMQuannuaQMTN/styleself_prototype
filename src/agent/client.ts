import type { AgentRequest, AgentResponse } from './types'

/** Same-origin endpoint. In dev it's the Vite middleware; in prod a serverless fn. */
const ENDPOINT = '/api/agent/chat'

/**
 * Send a turn to the StyleSelf agent runtime. `authToken` is only passed for the
 * merchant's own preview (to reach a not-yet-published agent) — the public
 * iframe calls this anonymously.
 */
export async function sendAgentMessage(
  req: AgentRequest,
  authToken?: string,
): Promise<AgentResponse> {
  let res: Response
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify(req),
    })
  } catch {
    return {
      ok: false,
      error: 'server',
      message: 'Could not reach the agent. Check your connection and retry.',
    }
  }

  const raw = await res.text().catch(() => '')
  let data: unknown
  try {
    data = raw ? JSON.parse(raw) : null
  } catch {
    data = null
  }

  // The endpoint always answers with our JSON envelope. A non-JSON body means a
  // gateway error (function crash, timeout, or missing deployment).
  if (!data || typeof data !== 'object') {
    return {
      ok: false,
      error: 'server',
      message:
        res.status === 504 || res.status === 408
          ? 'The assistant took too long to respond. Try a shorter question.'
          : `The assistant is unavailable right now (HTTP ${res.status}). Try again shortly.`,
    }
  }

  return data as AgentResponse
}
