/**
 * Isolated Visa Payments Stack simulator.
 *
 * Nothing here calls a real network — the hackathon brief asks for a *simulated*
 * Visa payment flow. What this module does provide is the real *shape* of that
 * flow: the four stages a card payment actually moves through, named as Visa /
 * Cybersource name them, each returning a response object that mirrors the real
 * API contract (decision, reason code, ISO-8583 processor response, network
 * token reference, authorization code, reconciliation id, settlement rail).
 *
 *   1. tokenize  — PAN → network token           (Visa Token Service / VTS)
 *   2. authorize — hold funds + 3-D Secure + agent mandate check → auth code
 *   3. capture   — move the authorized hold into clearing
 *   4. settle    — push funds to the merchant's account   (Visa Direct)
 *
 * The real PAN never reaches this module: the browser only ever sends a last-4 +
 * brand. Swapping in a real PSP means replacing the four exported functions and
 * nothing else — callers (orders.ts) depend only on this contract.
 */

// ---------------------------------------------------------------------------
// 1. Tokenize — Visa Token Service
// ---------------------------------------------------------------------------

export type NetworkToken = {
  tokenReferenceId: string
  tokenRequestorId: string
  panLast4: string
  /** The token's own PAN — distinct from the funding PAN. Faked to panLast4. */
  tokenLast4: string
  tokenExpiry: string
  tokenType: 'NETWORK_TOKEN'
  tokenState: 'ACTIVE'
  brand: string
}

export type TokenizeResult = {
  status: 'AUTHORIZED'
  networkToken: NetworkToken
}

export function tokenizeCard(input: {
  last4: string
  brand: string | null
}): TokenizeResult {
  const last4 = /^\d{4}$/.test(input.last4) ? input.last4 : '0000'
  return {
    status: 'AUTHORIZED',
    networkToken: {
      tokenReferenceId: id('VTS', 24),
      tokenRequestorId: digits(11),
      panLast4: last4,
      tokenLast4: last4,
      tokenExpiry: tokenExpiry(),
      tokenType: 'NETWORK_TOKEN',
      tokenState: 'ACTIVE',
      brand: input.brand ?? 'Visa',
    },
  }
}

// ---------------------------------------------------------------------------
// 2. Authorize — funds hold + 3-D Secure + agent payment mandate
// ---------------------------------------------------------------------------

export type AgentMandateInput = {
  mandateId: string
  /** Ceiling the shopper authorized the agent to spend without a fresh prompt. */
  limitCents: number
}

export type AuthorizeAccept = {
  decision: 'ACCEPT'
  reasonCode: '100'
  authorizationCode: string
  /** ISO 8583 field 39 — "00" = approved. */
  processorResponse: '00'
  networkTransactionId: string
  amount: { authorizedCents: number; currency: string }
  /** Address Verification Service result — "Y" = full match. */
  avs: 'Y'
  /** Card Verification result — "M" = match. */
  cvv: 'M'
  threeDS: {
    version: '2.2.0'
    /** Electronic Commerce Indicator — "05" = fully authenticated. */
    eci: '05'
    cavvPresent: true
    authenticationStatus: 'Y'
  }
  agentMandate: {
    present: boolean
    mandateId: string | null
    withinLimit: boolean
  }
}

export type AuthorizeDecline = {
  decision: 'DECLINE'
  reasonCode: '201' | '203'
  processorResponse: '05'
  message: string
}

export type AuthorizeResult = AuthorizeAccept | AuthorizeDecline

export function authorize(input: {
  token: NetworkToken
  amountCents: number
  currency: string
  mandate?: AgentMandateInput | null
}): AuthorizeResult {
  // Demo hook: the canonical "declined" test card (4000 0000 0000 0002) so the
  // decline branch is reachable in a live demo. Everything else is approved.
  if (input.token.panLast4 === '0002') {
    return {
      decision: 'DECLINE',
      reasonCode: '201',
      processorResponse: '05',
      message: 'Issuer declined the authorization (do not honor).',
    }
  }

  const mandate = input.mandate ?? null

  // Agent payment mandate check — Visa's agent-authorization model: the charge
  // must sit within the ceiling the shopper granted the agent. Over it → decline
  // before any funds are held.
  if (mandate && input.amountCents > mandate.limitCents) {
    return {
      decision: 'DECLINE',
      reasonCode: '203',
      processorResponse: '05',
      message: 'Amount exceeds the agent payment mandate authorized by the cardholder.',
    }
  }

  return {
    decision: 'ACCEPT',
    reasonCode: '100',
    authorizationCode: authCode(),
    processorResponse: '00',
    networkTransactionId: digits(15),
    amount: { authorizedCents: input.amountCents, currency: input.currency },
    avs: 'Y',
    cvv: 'M',
    threeDS: {
      version: '2.2.0',
      eci: '05',
      cavvPresent: true,
      authenticationStatus: 'Y',
    },
    agentMandate: {
      present: Boolean(mandate),
      mandateId: mandate?.mandateId ?? null,
      withinLimit: mandate ? input.amountCents <= mandate.limitCents : true,
    },
  }
}

// ---------------------------------------------------------------------------
// 3. Capture — move the hold into clearing
// ---------------------------------------------------------------------------

export type CaptureResult = {
  status: 'PENDING_SETTLEMENT'
  reconciliationId: string
  capturedCents: number
  /** Next business day, ISO date. */
  clearingDate: string
}

export function capture(input: {
  authorizationCode: string
  amountCents: number
}): CaptureResult {
  return {
    status: 'PENDING_SETTLEMENT',
    reconciliationId: id('RECON', 18),
    capturedCents: input.amountCents,
    clearingDate: addBusinessDaysISO(1),
  }
}

// ---------------------------------------------------------------------------
// 4. Settle — Visa Direct push to the merchant's payout account
// ---------------------------------------------------------------------------

export type SettlementResult = {
  status: 'SETTLED'
  settlementId: string
  rail: 'VISA_DIRECT'
  creditedTo: string | null
  /** Simulated interchange + scheme fee: ~1.8% + 10¢. */
  interchangeCents: number
  netToMerchantCents: number
  settlementDate: string
}

export function settle(input: {
  reconciliationId: string
  amountCents: number
  payoutAccount: string | null
}): SettlementResult {
  const interchangeCents = Math.round(input.amountCents * 0.018) + 10
  return {
    status: 'SETTLED',
    settlementId: id('STL', 18),
    rail: 'VISA_DIRECT',
    creditedTo: input.payoutAccount,
    interchangeCents,
    netToMerchantCents: Math.max(0, input.amountCents - interchangeCents),
    settlementDate: addBusinessDaysISO(1),
  }
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function id(prefix: string, hexLen: number): string {
  let s = ''
  while (s.length < hexLen) s += Math.random().toString(16).slice(2)
  return `${prefix}-${s.slice(0, hexLen).toUpperCase()}`
}

function digits(n: number): string {
  let s = ''
  while (s.length < n) s += Math.floor(Math.random() * 1e9).toString()
  return s.slice(0, n)
}

/** 6-char alphanumeric, uppercase — the format a real auth code takes. */
function authCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 6; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return s
}

function tokenExpiry(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${mm}/${d.getFullYear() + 4}`
}

function addBusinessDaysISO(days: number): string {
  const d = new Date()
  let added = 0
  while (added < days) {
    d.setDate(d.getDate() + 1)
    const day = d.getDay()
    if (day !== 0 && day !== 6) added++
  }
  return d.toISOString().slice(0, 10)
}
