import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../src/lib/database.types'
import type { AgentCheckoutError, AgentCheckoutResponse } from '../../src/agent/types'
import { readAgentEnv } from './env'
import { DbCatalog, DemoCatalog, type Catalog } from './catalog'
import { sign, verify } from './signing'
import {
  runCheckout,
  simulateCheckout,
  type CheckoutInput,
  type DraftItem,
} from './orders'

type EnvBag = Record<string, string | undefined>

type DraftPayload = {
  kind: 'draft'
  agentId: string
  conversationId: string
  draftHash: string
  items: DraftItem[]
  fulfillment: 'delivery' | 'pickup'
  locationId: string | null
  currency: string
  totalCents: number
  /** Agent payment mandate minted with the order preview (see runtime.ts). */
  mandateId: string
  mandateLimitCents: number
  exp: number
}

type AuthPayload = {
  kind: 'auth'
  draftHash: string
  agentId: string
  conversationId: string
  buyerName: string
  /** Carried to the pay step so the Visa pipeline can tokenize the card. */
  cardLast4: string
  cardBrand: string | null
  /** Agent payment mandate echoed from the draft — enforced at authorize time. */
  mandateId: string
  mandateLimitCents: number
  exp: number
}

type Resolved = {
  kind: 'demo' | 'db'
  catalog: Catalog
  storeId: string | null
  supabase: SupabaseClient<Database> | null
  merchantName: string
  settlement: string | null
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

function fail(
  status: number,
  error: AgentCheckoutError['error'],
  message: string,
): { status: number; body: AgentCheckoutError } {
  return { status, body: { ok: false, error, message } }
}

/**
 * Deterministic checkout endpoint — NO AI. Two actions:
 *  - 'authorize': identity + card capture -> signed session authorization
 *  - 'pay':       requires both the draft and authorization tokens -> order + stock decrement
 */
export async function handleCheckout(
  body: unknown,
  authHeader: string | undefined,
  rawEnv: EnvBag,
): Promise<{ status: number; body: AgentCheckoutResponse }> {
  const env = readAgentEnv(rawEnv)
  const req = (body ?? {}) as Record<string, unknown>

  const action = str(req.action)
  const agentId = str(req.agentId)
  const conversationId = str(req.conversationId) || 'anon'
  if (!agentId) return fail(400, 'bad_request', 'Missing agentId.')
  if (action !== 'authorize' && action !== 'pay') {
    return fail(400, 'bad_request', 'Unknown action.')
  }

  const draftToken = str(req.orderDraftToken)
  if (!draftToken) return fail(400, 'bad_request', 'Missing order token.')
  const draft = verify<DraftPayload>(draftToken, env.signingSecret)
  if (!draft || draft.kind !== 'draft') {
    return fail(400, 'expired', 'This order has expired — ask the assistant to prepare it again.')
  }
  if (draft.agentId !== agentId || draft.conversationId !== conversationId) {
    return fail(400, 'bad_request', 'This order does not match your session.')
  }
  if (!Array.isArray(draft.items) || draft.items.length === 0) {
    return fail(400, 'bad_request', 'The order is empty.')
  }

  const resolved = await resolveAgent(agentId, authHeader, str(req.embedKey), env)
  if (resolved === 'unconfigured') {
    return fail(500, 'server', 'The agent backend is not configured.')
  }
  if (resolved === 'forbidden') {
    return fail(403, 'forbidden', 'This embed is not authorised for checkout.')
  }
  if (!resolved) return fail(404, 'not_found', 'No agent found at this address.')

  if (action === 'authorize') {
    const buyerName = str(req.buyerName)
    const card = (req.card ?? {}) as { last4?: unknown; brand?: unknown }
    const last4 = str(card.last4)
    const brand = str(card.brand) ?? null

    if (!buyerName || buyerName.length < 2) {
      return fail(400, 'bad_request', 'Enter the cardholder name.')
    }
    if (!last4 || !/^\d{4}$/.test(last4)) {
      return fail(400, 'bad_request', 'Enter valid card details.')
    }

    const shortage = await checkStock(resolved.catalog, draft)
    if (shortage) return fail(409, 'stock', shortage)

    const now = Date.now()
    const token = sign(
      {
        kind: 'auth',
        draftHash: draft.draftHash,
        agentId,
        conversationId,
        buyerName,
        cardLast4: last4,
        cardBrand: brand,
        mandateId: draft.mandateId,
        mandateLimitCents: draft.mandateLimitCents,
        iat: now,
        exp: now + 10 * 60 * 1000,
      },
      env.signingSecret,
    )
    return {
      status: 200,
      body: {
        ok: true,
        kind: 'authorization',
        token,
        verified: true,
        message: 'Card authorized — payment is linked to this session.',
      },
    }
  }

  // action === 'pay'
  const authToken = str(req.authorizationToken)
  if (!authToken) return fail(400, 'bad_request', 'Payment has not been authorized yet.')
  const auth = verify<AuthPayload>(authToken, env.signingSecret)
  if (
    !auth ||
    auth.kind !== 'auth' ||
    auth.draftHash !== draft.draftHash ||
    auth.agentId !== agentId ||
    auth.conversationId !== conversationId
  ) {
    return fail(400, 'bad_request', 'Authorization is invalid or expired — verify again.')
  }

  const input: CheckoutInput = {
    conversationId,
    draftHash: draft.draftHash,
    buyerName: auth.buyerName,
    buyerEmail: null,
    fulfillment: draft.fulfillment === 'pickup' ? 'pickup' : 'delivery',
    locationId: draft.locationId ?? null,
    currency: draft.currency,
    items: draft.items,
    merchantName: resolved.merchantName,
    cardLast4: auth.cardLast4 ?? '0000',
    cardBrand: auth.cardBrand ?? null,
    settlement: resolved.settlement,
    mandate: {
      mandateId: auth.mandateId ?? draft.mandateId,
      limitCents: auth.mandateLimitCents ?? draft.mandateLimitCents,
    },
  }

  const result =
    resolved.kind === 'demo'
      ? await simulateCheckout(resolved.catalog, input)
      : await runCheckout(resolved.supabase!, resolved.storeId!, resolved.catalog, input)

  if (!result.ok) {
    const status = result.error === 'stock' ? 409 : result.error === 'declined' ? 402 : 400
    return { status, body: result }
  }
  return { status: 200, body: result }
}

async function resolveAgent(
  agentId: string,
  authHeader: string | undefined,
  embedKey: string | undefined,
  env: ReturnType<typeof readAgentEnv>,
): Promise<Resolved | null | 'unconfigured' | 'forbidden'> {
  if (agentId === 'demo') {
    return {
      kind: 'demo',
      catalog: new DemoCatalog(),
      storeId: null,
      supabase: null,
      merchantName: 'Urban Thread',
      settlement: 'Urban Thread · DBS ••4291',
    }
  }
  if (!env.supabaseUrl || !env.supabaseAnonKey) return 'unconfigured'

  const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: authHeader ? { headers: { Authorization: authHeader } } : {},
  })

  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('slug', agentId)
    .maybeSingle()
  if (!store) return null

  if (!authHeader && store.embed_key) {
    const key = (embedKey ?? '').trim()
    const wrong = key !== '' && key !== store.embed_key
    const missing = key === '' && store.embed_key_required
    if (wrong || missing) return 'forbidden'
  }

  const [{ data: agentRow }, { data: locRows }] = await Promise.all([
    supabase.from('store_agents').select('currency').eq('store_id', store.id).maybeSingle(),
    supabase
      .from('store_locations')
      .select('id, name, is_primary')
      .eq('store_id', store.id)
      .order('is_primary', { ascending: false }),
  ])

  const locations = (locRows ?? []).map((l) => ({ id: l.id, name: l.name }))
  const currency = agentRow?.currency ?? 'USD'
  const settlement = store.payout_account_last4
    ? `${store.name} · ${store.payout_bank_name ?? 'Bank'} ••${store.payout_account_last4}`
    : null

  return {
    kind: 'db',
    catalog: new DbCatalog(supabase, store.id, currency, locations),
    storeId: store.id,
    supabase,
    merchantName: store.name,
    settlement,
  }
}

async function checkStock(catalog: Catalog, draft: DraftPayload): Promise<string | null> {
  const products = await catalog.byIds([...new Set(draft.items.map((i) => i.productId))])
  const byId = new Map(products.map((p) => [p.id, p]))
  for (const it of draft.items) {
    const p = byId.get(it.productId)
    const v = p?.variants.find((x) => x.id === it.variantId)
    if (!p || !v) return 'One of those items is no longer available.'
    const stock = Object.values(v.stockByLocation).reduce((a, b) => a + b, 0)
    if (stock < it.quantity) {
      return `${p.name} just sold out — ask the assistant for an alternative.`
    }
  }
  return null
}
