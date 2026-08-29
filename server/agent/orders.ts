import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../src/lib/database.types'
import type { AgentOrderConfirmation, AgentCheckoutError } from '../../src/agent/types'
import type { Catalog } from './catalog'
import { variantLabel } from './tools'
import { authorize, capture, settle, tokenizeCard } from './visa'

export type DraftItem = { productId: string; variantId: string; quantity: number }

export type CheckoutInput = {
  conversationId: string
  draftHash: string
  buyerName: string
  buyerEmail: string | null
  fulfillment: 'delivery' | 'pickup'
  locationId: string | null
  currency: string
  items: DraftItem[]
  merchantName: string
  /** Card last-4 + brand carried from the authorize step (never the full PAN). */
  cardLast4: string
  cardBrand: string | null
  /** Human-readable settlement destination, or null when unset. */
  settlement: string | null
  /** Agent payment mandate — the ceiling the shopper authorized the agent to spend. */
  mandate: { mandateId: string; limitCents: number }
}

const FEE_CENTS = 500

/** The Visa Payments Stack receipt assembled from the four simulator stages. */
type VisaReceipt = NonNullable<AgentOrderConfirmation['visa']> & {
  authorizationCode: string
}

/**
 * Run the amount through the simulated Visa Payments Stack:
 *   tokenize (VTS) → authorize (3-DS + mandate) → capture → settle (Visa Direct).
 * Returns the receipt on approval, or an AgentCheckoutError on a decline — the
 * caller must bail before touching stock when that happens.
 */
function runVisaPipeline(
  input: CheckoutInput,
  totalCents: number,
): VisaReceipt | AgentCheckoutError {
  const { networkToken } = tokenizeCard({
    last4: input.cardLast4,
    brand: input.cardBrand,
  })

  const auth = authorize({
    token: networkToken,
    amountCents: totalCents,
    currency: input.currency,
    mandate: { mandateId: input.mandate.mandateId, limitCents: input.mandate.limitCents },
  })
  if (auth.decision !== 'ACCEPT') {
    return {
      ok: false,
      error: 'declined',
      message:
        auth.reasonCode === '203'
          ? 'This charge is above the amount you authorized the agent to spend.'
          : `Payment declined by the issuer (${auth.reasonCode}).`,
    }
  }

  const cleared = capture({
    authorizationCode: auth.authorizationCode,
    amountCents: totalCents,
  })
  const settled = settle({
    reconciliationId: cleared.reconciliationId,
    amountCents: totalCents,
    payoutAccount: input.settlement,
  })

  return {
    authorizationCode: auth.authorizationCode,
    networkToken: {
      last4: networkToken.tokenLast4,
      reference: networkToken.tokenReferenceId,
      brand: networkToken.brand,
    },
    decision: 'ACCEPT',
    processorResponse: auth.processorResponse,
    threeDSEci: auth.threeDS.eci,
    agentMandate: {
      mandateId: input.mandate.mandateId,
      limitCents: input.mandate.limitCents,
      withinLimit: auth.agentMandate.withinLimit,
    },
    clearing: {
      reconciliationId: cleared.reconciliationId,
      settlementId: settled.settlementId,
      rail: settled.rail === 'VISA_DIRECT' ? 'Visa Direct' : settled.rail,
      interchangeCents: settled.interchangeCents,
      netToMerchantCents: settled.netToMerchantCents,
    },
  }
}

async function lineRows(catalog: Catalog, items: DraftItem[]) {
  const products = await catalog.byIds([...new Set(items.map((i) => i.productId))])
  const byId = new Map(products.map((p) => [p.id, p]))
  return items.map((i) => {
    const p = byId.get(i.productId)
    const v = p?.variants.find((x) => x.id === i.variantId)
    const unit = v?.priceCents ?? p?.priceCents ?? 0
    return {
      name: p?.name ?? 'Item',
      variantLabel: v ? variantLabel(v) : null,
      quantity: i.quantity,
      lineTotalCents: unit * i.quantity,
    }
  })
}

// Warm-instance idempotency for the demo (the real path uses a unique DB index).
const demoOrders = new Map<string, AgentOrderConfirmation>()

/** /agent/demo — no database. Decrements the in-memory demo catalog. */
export async function simulateCheckout(
  catalog: Catalog,
  input: CheckoutInput,
): Promise<AgentOrderConfirmation | AgentCheckoutError> {
  const key = `${input.conversationId}|${input.draftHash}`
  const cached = demoOrders.get(key)
  if (cached) return cached

  const locId = input.locationId ?? catalog.locations[0]?.id ?? null
  const products = await catalog.byIds([...new Set(input.items.map((item) => item.productId))])
  const byId = new Map(products.map((product) => [product.id, product]))
  for (const item of input.items) {
    const variant = byId.get(item.productId)?.variants.find((candidate) => candidate.id === item.variantId)
    const stock = variant
      ? Object.values(variant.stockByLocation).reduce((sum, quantity) => sum + quantity, 0)
      : 0
    if (!variant || stock < item.quantity) {
      return { ok: false, error: 'stock', message: 'One of those items just sold out — ask the assistant for an alternative.' }
    }
  }
  const items = await lineRows(catalog, input.items)
  const subtotal = items.reduce((s, l) => s + l.lineTotalCents, 0)
  const fees = input.fulfillment === 'delivery' ? FEE_CENTS : 0
  const total = subtotal + fees

  const receipt = runVisaPipeline(input, total)
  if ('ok' in receipt) return receipt

  for (const it of input.items) {
    if (catalog.decrementStockAcrossLocations) {
      catalog.decrementStockAcrossLocations(it.variantId, it.quantity, locId)
    } else if (locId && catalog.decrementStock) {
      catalog.decrementStock(it.variantId, locId, it.quantity)
    }
  }

  const { authorizationCode, ...visa } = receipt
  const confirmation: AgentOrderConfirmation = {
    ok: true,
    kind: 'order',
    orderId: `demo_${Math.random().toString(36).slice(2, 10)}`,
    status: 'paid',
    merchantName: input.merchantName,
    currency: input.currency,
    items,
    subtotalCents: subtotal,
    feesCents: fees,
    totalCents: total,
    visaAuthCode: authorizationCode,
    visa,
    settlement: input.settlement,
    message: 'Payment authorized and your order is confirmed.',
  }
  demoOrders.set(key, confirmation)
  return confirmation
}

/** Live store — the SECURITY DEFINER RPC is the only writer + inventory decrement. */
export async function runCheckout(
  supabase: SupabaseClient<Database>,
  storeId: string,
  catalog: Catalog,
  input: CheckoutInput,
): Promise<AgentOrderConfirmation | AgentCheckoutError> {
  const items = await lineRows(catalog, input.items)
  const total = items.reduce((s, l) => s + l.lineTotalCents, 0) +
    (input.fulfillment === 'delivery' ? FEE_CENTS : 0)

  const receipt = runVisaPipeline(input, total)
  if ('ok' in receipt) return receipt

  const { data, error } = await supabase.rpc('agent_checkout', {
    p_store: storeId,
    p_conversation: input.conversationId,
    p_draft_hash: input.draftHash,
    p_buyer_name: input.buyerName,
    p_buyer_email: input.buyerEmail,
    p_fulfillment: input.fulfillment,
    p_location: input.locationId,
    p_currency: input.currency,
    p_items: input.items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
  })

  if (error) {
    const m = error.message || 'checkout failed'
    if (/insufficient stock/i.test(m)) {
      return {
        ok: false,
        error: 'stock',
        message: 'One of those items just sold out — ask the assistant for an alternative.',
      }
    }
    if (/not available/i.test(m)) {
      return { ok: false, error: 'not_found', message: 'That item is no longer available.' }
    }
    return { ok: false, error: 'server', message: 'The payment could not be completed.' }
  }

  const order = data as Database['public']['Tables']['agent_orders']['Row']
  const { authorizationCode, ...visa } = receipt

  return {
    ok: true,
    kind: 'order',
    orderId: order.id,
    status: 'paid',
    merchantName: input.merchantName,
    currency: order.currency,
    items,
    subtotalCents: order.subtotal_cents,
    feesCents: order.fees_cents,
    totalCents: order.total_cents,
    visaAuthCode: order.visa_auth_code ?? authorizationCode,
    visa,
    settlement: input.settlement,
    message: 'Payment authorized and your order is confirmed.',
  }
}
