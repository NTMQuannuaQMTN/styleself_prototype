import type { AgentContext } from '../../src/agent/types.ts'
import type { CatalogProduct } from './catalog.ts'
import { fmtMoney } from './tools.ts'

export type MerchantConfig = {
  storeName: string
  branchName: string | null
  tone: string
  currency: string
  recommendationLimit: number
  rules: string | null
  locationNames: string[]
  multiLocation: boolean
}

/**
 * Compact system prompt. Merchant config is injected but kept terse — no catalog
 * data goes in here (that comes from tools).
 */
export function buildSystemPrompt(cfg: MerchantConfig): string {
  const where = cfg.branchName ? `${cfg.storeName} — ${cfg.branchName}` : cfg.storeName
  const lines = [
    `You are StyleSelf's Fashion Commerce Agent for ${where}, a fashion store.`,
    `Help the shopper discover, compare, and buy from this store's real catalog.`,
    `Brand tone: ${cfg.tone}. Prices are in ${cfg.currency}.`,
    cfg.multiLocation
      ? `This is a multi-location store: ${cfg.locationNames.join(', ')}. Mention where items are in stock.`
      : cfg.locationNames[0]
        ? `Single location: ${cfg.locationNames[0]}.`
        : ``,
    cfg.rules ? `Merchant rules: ${cfg.rules}` : ``,
    ``,
    `How to work:`,
    `- Use tools for every catalog, price, size, stock, and total. Never invent products, prices, sizes, colours, or availability.`,
    `- Discovery -> search_products. "What's the difference / which is better" -> compare_products with the relevant ids. "Is it in stock / in size M" -> check_inventory. Ready to buy -> create_order_preview.`,
    `- The shown-products list tells you what "the first one" / "the cheaper one" refers to — use those ids directly, no extra search.`,
    `- Recommend at most ${cfg.recommendationLimit} products; lead with your single best pick and say why in one sentence.`,
    `- Ask at most one clarifying question, and only when you genuinely cannot act yet.`,
    `- Keep replies to 2–4 short sentences. Plain sentences only — no markdown, bullet points, dashes, or HTML.`,
    `- Before an order preview, make sure size and colour are chosen. create_order_preview does the maths.`,
    `- After create_order_preview, say one short sentence like "Here's your order — press Confirm & Pay when ready." Do NOT re-list the line items or totals; the card shows them.`,
    `- Never say an order is placed or paid. The shopper presses "Confirm & Pay" in the UI.`,
  ]
  return lines.filter((l) => l !== ``).join('\n')
}

/** A tiny "what's on screen" block so the model resolves "the first two" without a tool call. */
export function contextBlock(
  context: AgentContext,
  shown: CatalogProduct[],
  currency: string,
): string | null {
  if (shown.length === 0) return null
  const list = shown
    .map((p, i) => `${i + 1}. ${p.name} — ${fmtMoney(p.priceCents, currency)} [id: ${p.id}]`)
    .join('\n')
  const parts = [`Products currently shown to the shopper:\n${list}`]
  if (context.selectedProductIds.length) {
    parts.push(`Selected for purchase: ${context.selectedProductIds.join(', ')}`)
  }
  const p = context.preferences
  const prefBits = [
    p.budgetCents != null ? `budget ~${fmtMoney(p.budgetCents, currency)}` : null,
    p.sizes?.length ? `sizes ${p.sizes.join('/')}` : null,
    p.colors?.length ? `colours ${p.colors.join('/')}` : null,
    p.occasions?.length ? `occasion ${p.occasions.join('/')}` : null,
  ].filter(Boolean)
  if (prefBits.length) parts.push(`Known preferences: ${prefBits.join(', ')}`)
  return parts.join('\n')
}
