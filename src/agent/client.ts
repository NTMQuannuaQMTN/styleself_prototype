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

  let data: unknown
  try {
    data = await res.json()
  } catch {
    return {
      ok: false,
      error: 'server',
      message: 'The agent returned an unexpected response.',
    }
  }

  return data as AgentResponse
}
