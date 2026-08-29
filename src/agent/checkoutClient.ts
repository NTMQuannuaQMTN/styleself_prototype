import type {
  AgentAuthorizeRequest,
  AgentCheckoutResponse,
  AgentPayRequest,
} from './types'

const ENDPOINT = '/api/agent/checkout'

async function post(
  payload: AgentAuthorizeRequest | AgentPayRequest,
  authToken?: string,
): Promise<AgentCheckoutResponse> {
  let res: Response
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify(payload),
    })
  } catch {
    return {
      ok: false,
      error: 'server',
      message: 'Could not reach the payment service. Check your connection and retry.',
    }
  }

  const raw = await res.text().catch(() => '')
  let data: unknown
  try {
    data = raw ? JSON.parse(raw) : null
  } catch {
    data = null
  }
  if (!data || typeof data !== 'object') {
    return {
      ok: false,
      error: 'server',
      message: `Payment service unavailable (HTTP ${res.status}). Try again shortly.`,
    }
  }
  return data as AgentCheckoutResponse
}

export function authorizePayment(
  req: Omit<AgentAuthorizeRequest, 'action'>,
  authToken?: string,
) {
  return post({ ...req, action: 'authorize' }, authToken)
}

export function executePayment(
  req: Omit<AgentPayRequest, 'action'>,
  authToken?: string,
) {
  return post({ ...req, action: 'pay' }, authToken)
}
