/**
 * Wire types shared by the browser chat client and the server agent runtime.
 * Pure types only — no imports, safe on both sides.
 */

export type ChatRole = 'user' | 'assistant'

export type ChatTurn = { role: ChatRole; content: string }

/** Lightweight conversation state the client keeps and echoes back each turn. */
export type AgentContext = {
  /** Product ids currently on screen, in display order — resolves "the first two". */
  shownProductIds: string[]
  /** Product ids the shopper has committed to (order preview). */
  selectedProductIds: string[]
  preferences: {
    budgetCents?: number
    colors?: string[]
    sizes?: string[]
    styles?: string[]
    occasions?: string[]
  }
}

export function emptyContext(): AgentContext {
  return { shownProductIds: [], selectedProductIds: [], preferences: {} }
}

export type AgentRequest = {
  agentId: string
  conversationId: string
  /** Recent turns (capped by the client). Empty array = open the conversation. */
  messages: ChatTurn[]
  context: AgentContext
}

/** Public, non-sensitive product shape rendered as a card in the iframe. */
export type AgentProductCard = {
  id: string
  name: string
  brand: string | null
  category: string | null
  priceCents: number
  currency: string
  imageUrl: string | null
  inStock: boolean
  /** highlighted as the agent's top pick */
  recommended?: boolean
}

export type AgentComparison = {
  rows: { label: string; values: string[] }[]
  products: { id: string; name: string }[]
}

export type OrderPreviewLine = {
  name: string
  variant: string | null
  quantity: number
  unitPriceCents: number
  lineTotalCents: number
}

export type AgentOrderPreview = {
  lines: OrderPreviewLine[]
  subtotalCents: number
  deliveryCents: number
  totalCents: number
  currency: string
  fulfillment: 'delivery' | 'pickup'
  location: string | null
  allInStock: boolean
}

export type AgentAction =
  | { type: 'none' }
  | { type: 'show_products' }
  | { type: 'show_comparison' }
  | { type: 'show_order_preview' }
  | { type: 'request_confirmation' }

export type AgentBranding = {
  storeName: string
  branchName: string | null
  agentName: string
  greeting: string
  currency: string
  multiLocation: boolean
  locations: string[]
  live: boolean
  /** true when an authenticated store member is previewing a draft agent */
  preview: boolean
}

export type AgentReply = {
  ok: true
  agent: AgentBranding
  message: string
  products?: AgentProductCard[]
  comparison?: AgentComparison
  orderPreview?: AgentOrderPreview
  action: AgentAction
  context: AgentContext
}

export type AgentError = {
  ok: false
  error: 'not_found' | 'not_live' | 'not_configured' | 'bad_request' | 'server'
  message: string
}

export type AgentResponse = AgentReply | AgentError
