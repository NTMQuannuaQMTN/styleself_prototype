import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../src/lib/database.types'
import type { AgentOrderConfirmation, AgentCheckoutError } from '../../src/agent/types'
import type { Catalog } from './catalog'
import { variantLabel } from './tools'

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
}

const FEE_CENTS = 500

/** Simulated Visa authorization. Deterministic success; the decline branch is
 *  isolated so a real PSP call can replace this without touching callers. */
function simulateVisaAuth(): { authorized: true } | { authorized: false; reason: string } {
  return { authorized: true }
}

function authCode(): string {
  return `VISA-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
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

  const visa = simulateVisaAuth()
  if (!visa.authorized) {
    return { ok: false, error: 'declined', message: `Payment declined: ${visa.reason}` }
  }

  const locId = input.locationId ?? catalog.locations[0]?.id ?? null
  const items = await lineRows(catalog, input.items)
  const subtotal = items.reduce((s, l) => s + l.lineTotalCents, 0)
  const fees = input.fulfillment === 'delivery' ? FEE_CENTS : 0

  if (locId && catalog.decrementStock) {
    for (const it of input.items) catalog.decrementStock(it.variantId, locId, it.quantity)
  }

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
    totalCents: subtotal + fees,
    visaAuthCode: authCode(),
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
  const visa = simulateVisaAuth()
  if (!visa.authorized) {
    return { ok: false, error: 'declined', message: `Payment declined: ${visa.reason}` }
  }

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
  const items = await lineRows(catalog, input.items)

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
    visaAuthCode: order.visa_auth_code ?? authCode(),
    message: 'Payment authorized and your order is confirmed.',
  }
}
