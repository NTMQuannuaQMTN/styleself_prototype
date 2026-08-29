import OpenAI from 'openai'
import type {
  AgentAction,
  AgentCart,
  AgentComparison,
  AgentContext,
  AgentProductCard,
  AgentReply,
  ChatTurn,
} from '../../src/agent/types'
import type { Catalog, CatalogProduct } from './catalog'
import { totalStock } from './catalog'
import { buildSystemPrompt, contextBlock, type MerchantConfig } from './prompt'
import {
  buildCartSummary,
  executeTool,
  fmtMoney,
  sanitizeCart,
  TOOL_SCHEMAS,
  type ToolContext,
} from './tools'
import { sha256Hex, sign } from './signing'

const MAX_TOOL_ROUNDS = 3
const MAX_HISTORY = 8
const DRAFT_TTL_MS = 15 * 60 * 1000

export type TurnInput = {
  messages: ChatTurn[]
  context: AgentContext
  catalog: Catalog
  config: MerchantConfig
  agentId: string
  conversationId: string
  signingSecret: string
}

export type TurnOutput = Pick<
  AgentReply,
  | 'message'
  | 'products'
  | 'comparison'
  | 'cart'
  | 'orderPreview'
  | 'orderDraftToken'
  | 'action'
  | 'context'
>

type ChatMsg = OpenAI.Chat.Completions.ChatCompletionMessageParam

/** Keep the first `max` sentences — used to stop the model narrating a table. */
function firstSentences(s: string, max: number): string {
  const parts = s.match(/[^.!?]+[.!?]+(\s|$)/g)
  if (!parts || parts.length <= max) return s.trim()
  return parts.slice(0, max).join('').trim()
}

/** The model occasionally reaches for markdown despite the prompt. Flatten it. */
function stripMarkdown(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(^|\s)\*(\S.*?\S)\*(?=\s|$)/g, '$1$2')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function cardFor(p: CatalogProduct, currency: string): AgentProductCard {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    priceCents: p.priceCents,
    currency,
    imageUrl: p.imageUrl,
    inStock: totalStock(p) > 0,
  }
}

/** Run one conversational turn: model + tools + deterministic response assembly. */
export async function runTurn(
  openai: OpenAI,
  model: string,
  input: TurnInput,
): Promise<TurnOutput> {
  const { catalog, config } = input
  const context: AgentContext = {
    shownProductIds: [...input.context.shownProductIds],
    recommendedProductIds: [...(input.context.recommendedProductIds ?? [])],
    viewedProductIds: [...(input.context.viewedProductIds ?? [])],
    selectedProductIds: [...input.context.selectedProductIds],
    cart: [],
    preferences: { ...input.context.preferences },
  }

  // re-validate the client-echoed bag against live stock before the model sees it
  const cart = await sanitizeCart(input.context.cart ?? [], catalog)
  context.cart = cart

  const shown =
    context.shownProductIds.length > 0
      ? await catalog.byIds(context.shownProductIds)
      : []
  // keep display order
  const shownOrdered = context.shownProductIds
    .map((id) => shown.find((p) => p.id === id))
    .filter((p): p is CatalogProduct => !!p)

  const cartForPrompt = (await buildCartSummary(cart, catalog, config.currency))?.items ?? []
  const ctxBlock = contextBlock(context, shownOrdered, config.currency, cartForPrompt)

  const messages: ChatMsg[] = [
    { role: 'system', content: buildSystemPrompt(config) },
    ...(ctxBlock ? [{ role: 'system' as const, content: ctxBlock }] : []),
    ...input.messages.slice(-MAX_HISTORY).map(
      (m): ChatMsg => ({ role: m.role, content: m.content }),
    ),
  ]

  const toolCtx: ToolContext = {
    catalog,
    currency: config.currency,
    recommendationLimit: config.recommendationLimit,
    cart,
    cartChanged: false,
  }

  let finalText = ''
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const completion = await openai.chat.completions.create({
      model,
      messages,
      tools: TOOL_SCHEMAS,
      tool_choice: 'auto',
      temperature: 0.3,
      max_tokens: 450,
    })
    const choice = completion.choices[0]?.message
    if (!choice) break

    if (choice.tool_calls && choice.tool_calls.length > 0) {
      messages.push({
        role: 'assistant',
        content: choice.content ?? '',
        tool_calls: choice.tool_calls,
      })
      for (const call of choice.tool_calls) {
        if (call.type !== 'function') continue
        let args: Record<string, unknown> = {}
        try {
          args = JSON.parse(call.function.arguments || '{}')
        } catch {
          args = {}
        }
        let result: unknown
        try {
          result = await executeTool(call.function.name, args, toolCtx)
        } catch (err) {
          result = { error: err instanceof Error ? err.message : 'tool failed' }
        }
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result),
        })
      }
      continue
    }

    finalText = (choice.content ?? '').trim()
    break
  }

  finalText = stripMarkdown(finalText)
  if (!finalText) {
    finalText =
      "I'm having trouble putting that together right now — could you rephrase?"
  }

  // -------- assemble the structured response from what the tools produced --------
  let products: AgentProductCard[] | undefined
  let comparison: AgentComparison | undefined
  let orderDraftToken: string | undefined
  const orderPreview = toolCtx.lastOrderPreview
  let action: AgentAction = { type: 'none' }

  // the bag may have changed (add_to_cart) — always reflect the current state
  context.cart = toolCtx.cart
  const cartSummary: AgentCart | undefined =
    (await buildCartSummary(toolCtx.cart, catalog, config.currency)) ?? undefined
  if (toolCtx.cartChanged) action = { type: 'cart_updated' }

  if (toolCtx.lastDetails?.length) {
    for (const p of toolCtx.lastDetails) {
      if (!context.viewedProductIds.includes(p.id)) context.viewedProductIds.push(p.id)
    }
  }

  if (toolCtx.lastSearch && toolCtx.lastSearch.length > 0) {
    const list = toolCtx.lastSearch.slice(0, config.recommendationLimit)
    // the recommended product is the one named earliest in the reply
    const lower = finalText.toLowerCase()
    let recId: string | undefined
    let bestIdx = Infinity
    for (const p of list) {
      const idx = lower.indexOf(p.name.toLowerCase())
      if (idx !== -1 && idx < bestIdx) {
        bestIdx = idx
        recId = p.id
      }
    }
    const ordered = recId
      ? [
          ...list.filter((p) => p.id === recId),
          ...list.filter((p) => p.id !== recId),
        ]
      : list
    products = ordered.map((p) => ({
      ...cardFor(p, config.currency),
      recommended: p.id === recId,
    }))
    context.shownProductIds = ordered.map((p) => p.id)
    if (recId && !context.recommendedProductIds.includes(recId)) {
      context.recommendedProductIds.push(recId)
    }
    action = { type: 'show_products' }
  }

  if (toolCtx.lastCompare && toolCtx.lastCompare.length >= 2) {
    const ps = toolCtx.lastCompare
    const uniq = (xs: (string | null)[]) => [...new Set(xs.filter(Boolean))] as string[]
    const row = (label: string, get: (p: CatalogProduct) => string) => ({
      label,
      values: ps.map(get),
    })
    const allRows = [
      row('Price', (p) => fmtMoney(p.priceCents, config.currency)),
      row('Style', (p) => p.style ?? '—'),
      row('Material', (p) => p.material ?? '—'),
      row('Care', (p) => p.care ?? '—'),
      row('Colours', (p) => uniq(p.variants.map((v) => v.color)).join(', ') || '—'),
      row('Sizes', (p) => uniq(p.variants.map((v) => v.size)).join(', ') || '—'),
      row('In stock', (p) => (totalStock(p) > 0 ? 'Yes' : 'No')),
    ]
    // Drop rows where every product has the same value (no signal); keep Price.
    const rows = allRows.filter((r, i) => i === 0 || new Set(r.values).size > 1)
    comparison = {
      products: ps.map((p) => ({ id: p.id, name: p.name })),
      rows,
    }
    // The table carries the detail — trim any paragraph the model wrote over it.
    finalText = firstSentences(finalText, 2)
    action = { type: 'show_comparison' }
  }

  if (orderPreview && toolCtx.lastOrderDraft && toolCtx.lastOrderDraft.items.length > 0) {
    const d = toolCtx.lastOrderDraft
    const now = Date.now()
    const canonical = JSON.stringify(
      d.items.map((i) => [i.variantId, i.quantity, i.unitPriceCents]),
    )
    const draftHash = sha256Hex(`${canonical}|${d.totalCents}|${d.fulfillment}`)
    orderDraftToken = sign(
      {
        kind: 'draft',
        agentId: input.agentId,
        conversationId: input.conversationId,
        draftHash,
        items: d.items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
        fulfillment: d.fulfillment,
        locationId: d.locationId,
        subtotalCents: d.subtotalCents,
        feesCents: d.feesCents,
        totalCents: d.totalCents,
        currency: d.currency,
        iat: now,
        exp: now + DRAFT_TTL_MS,
      },
      input.signingSecret,
    )
    action = { type: 'show_order_preview' }
    if (toolCtx.lastOrderProductIds?.length) {
      context.selectedProductIds = toolCtx.lastOrderProductIds
    }
  }

  return {
    message: finalText,
    products,
    comparison,
    cart: cartSummary,
    orderPreview,
    orderDraftToken,
    action,
    context,
  }
}
