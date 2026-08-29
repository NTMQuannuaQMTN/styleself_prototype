import OpenAI from 'openai'
import type {
  AgentAction,
  AgentComparison,
  AgentContext,
  AgentProductCard,
  AgentReply,
  ChatTurn,
} from '../../src/agent/types'
import type { Catalog, CatalogProduct } from './catalog'
import { totalStock } from './catalog'
import { buildSystemPrompt, contextBlock, type MerchantConfig } from './prompt'
import { executeTool, fmtMoney, TOOL_SCHEMAS, type ToolContext } from './tools'

const MAX_TOOL_ROUNDS = 3
const MAX_HISTORY = 8

export type TurnInput = {
  messages: ChatTurn[]
  context: AgentContext
  catalog: Catalog
  config: MerchantConfig
}

export type TurnOutput = Pick<
  AgentReply,
  'message' | 'products' | 'comparison' | 'orderPreview' | 'action' | 'context'
>

type ChatMsg = OpenAI.Chat.Completions.ChatCompletionMessageParam

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
    selectedProductIds: [...input.context.selectedProductIds],
    preferences: { ...input.context.preferences },
  }

  const shown =
    context.shownProductIds.length > 0
      ? await catalog.byIds(context.shownProductIds)
      : []
  // keep display order
  const shownOrdered = context.shownProductIds
    .map((id) => shown.find((p) => p.id === id))
    .filter((p): p is CatalogProduct => !!p)

  const ctxBlock = contextBlock(context, shownOrdered, config.currency)

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

  if (!finalText) {
    finalText =
      "I'm having trouble putting that together right now — could you rephrase?"
  }

  // -------- assemble the structured response from what the tools produced --------
  let products: AgentProductCard[] | undefined
  let comparison: AgentComparison | undefined
  let orderPreview = toolCtx.lastOrderPreview
  let action: AgentAction = { type: 'none' }

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
    action = { type: 'show_products' }
  }

  if (toolCtx.lastCompare && toolCtx.lastCompare.length >= 2) {
    const ps = toolCtx.lastCompare
    const row = (label: string, get: (p: CatalogProduct) => string) => ({
      label,
      values: ps.map(get),
    })
    comparison = {
      products: ps.map((p) => ({ id: p.id, name: p.name })),
      rows: [
        row('Price', (p) => fmtMoney(p.priceCents, config.currency)),
        row('Style', (p) => p.style ?? '—'),
        row('Material', (p) => p.material ?? '—'),
        row('Category', (p) => p.category ?? '—'),
        row('For', (p) => p.gender ?? '—'),
        row('In stock', (p) => (totalStock(p) > 0 ? 'Yes' : 'No')),
      ],
    }
    action = { type: 'show_comparison' }
  }

  if (orderPreview) {
    action = { type: 'show_order_preview' }
    if (toolCtx.lastOrderProductIds?.length) {
      context.selectedProductIds = toolCtx.lastOrderProductIds
    }
  }

  return {
    message: finalText,
    products,
    comparison,
    orderPreview,
    action,
    context,
  }
}
