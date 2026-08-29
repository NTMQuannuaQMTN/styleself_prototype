/**
 * Wire types shared by the browser chat client and the server agent runtime.
 * Pure types only — no imports, safe on both sides.
 */

export type ChatRole = 'user' | 'assistant'

export type ChatTurn = { role: ChatRole; content: string }

/** One item in the shopper's bag. Echoed by the client, re-validated server-side. */
export type CartLine = {
  productId: string
  variantId: string | null
  size: string | null
  color: string | null
  quantity: number
}

/** Lightweight conversation state the client keeps and echoes back each turn. */
export type AgentContext = {
  /** Product ids currently on screen, in display order — resolves "the first two". */
  shownProductIds: string[]
  /** Products the agent has surfaced as recommendations across the conversation. */
  recommendedProductIds: string[]
  /** Products the shopper has asked to see details of. */
  viewedProductIds: string[]
  /** Product ids the shopper has committed to (order preview). */
  selectedProductIds: string[]
  /** The shopper's bag. */
  cart: CartLine[]
  preferences: {
    budgetCents?: number
    colors?: string[]
    sizes?: string[]
    styles?: string[]
    occasions?: string[]
  }
}

export function emptyContext(): AgentContext {
  return {
    shownProductIds: [],
    recommendedProductIds: [],
    viewedProductIds: [],
    selectedProductIds: [],
    cart: [],
    preferences: {},
  }
}

export type AgentRequest = {
  agentId: string
  conversationId: string
  /** Embed key from the iframe URL (?k=). Checked when the store requires it. */
  embedKey?: string
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
  /** short style descriptor, e.g. "Smart casual" */
  style?: string | null
  /** fabric, e.g. "100% linen" */
  material?: string | null
  /** care instructions, e.g. "Machine wash cold" */
  care?: string | null
  /** the merchant's product description — shown in the detail modal */
  description?: string | null
  /** distinct in-stock colours, in catalogue order. `hex` drives the swatch. */
  colors?: { name: string; hex: string | null }[]
  /** distinct sizes available, in catalogue order */
  sizes?: string[]
  /** 'in' = healthy, 'low' = few units left, 'out' = sold out */
  stockLevel?: 'in' | 'low' | 'out'
  /** units left when stockLevel === 'low' (drives "Only 3 left") */
  unitsLeft?: number
  /** one-line "why this fits you", lifted from the agent's reply */
  reason?: string
  /** true when this was surfaced as a near-match, not an exact one */
  nearestMatch?: boolean
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

/** Bag summary rendered under a turn. */
export type AgentCart = {
  items: {
    productId: string
    name: string
    variantLabel: string | null
    quantity: number
    unitPriceCents: number
  }[]
  subtotalCents: number
  currency: string
}

export type AgentAction =
  | { type: 'none' }
  | { type: 'show_products' }
  | { type: 'show_comparison' }
  | { type: 'cart_updated' }
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
  cart?: AgentCart
  orderPreview?: AgentOrderPreview
  /** Signed draft that ties the preview to the /checkout endpoint. */
  orderDraftToken?: string
  action: AgentAction
  context: AgentContext
}

export type AgentError = {
  ok: false
  error:
    | 'not_found'
    | 'not_live'
    | 'not_configured'
    | 'bad_request'
    | 'forbidden'
    | 'server'
  message: string
}

export type AgentResponse = AgentReply | AgentError

// ---------------------------------------------------------------------------
// Checkout — deterministic, no AI. POST /api/agent/checkout
// ---------------------------------------------------------------------------

/** Step 1: card capture → session payment authorization. */
export type AgentAuthorizeRequest = {
  action: 'authorize'
  agentId: string
  conversationId: string
  embedKey?: string
  orderDraftToken: string
  buyerName: string
  card: { last4: string; brand: string | null }
}

export type AgentAuthorization = {
  ok: true
  kind: 'authorization'
  /** Signed token required by the pay step. */
  token: string
  verified: true
  message: string
}

/** Step 2: execute payment. Requires both tokens. */
export type AgentPayRequest = {
  action: 'pay'
  agentId: string
  conversationId: string
  embedKey?: string
  orderDraftToken: string
  authorizationToken: string
}

export type AgentOrderConfirmation = {
  ok: true
  kind: 'order'
  orderId: string
  status: 'paid'
  merchantName: string
  currency: string
  items: {
    name: string
    variantLabel: string | null
    quantity: number
    lineTotalCents: number
  }[]
  subtotalCents: number
  feesCents: number
  totalCents: number
  visaAuthCode: string
  /** Where the funds settle, e.g. "Urban Thread · DBS ••4291". null if unset. */
  settlement: string | null
  message: string
}

export type AgentCheckoutError = {
  ok: false
  error:
    | 'bad_request'
    | 'expired'
    | 'stock'
    | 'declined'
    | 'not_found'
    | 'forbidden'
    | 'server'
  message: string
}

export type AgentCheckoutResponse =
  | AgentAuthorization
  | AgentOrderConfirmation
  | AgentCheckoutError
