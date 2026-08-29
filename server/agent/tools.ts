import type { AgentOrderPreview } from '../../src/agent/types'
import {
  rankProducts,
  totalStock,
  type Catalog,
  type CatalogProduct,
  type CatalogVariant,
} from './catalog'

const DELIVERY_FEE_CENTS = 500

export function fmtMoney(cents: number, currency: string): string {
  const amount = cents / 100
  const s = amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)
  return currency === 'USD' ? `$${s}` : `${s} ${currency}`
}

function variantLabel(v: { size: string | null; color: string | null }): string {
  return [v.size, v.color].filter(Boolean).join(' / ') || 'One size'
}

function variantStock(v: CatalogVariant): number {
  return Object.values(v.stockByLocation).reduce((a, b) => a + b, 0)
}

export type ToolContext = {
  catalog: Catalog
  currency: string
  recommendationLimit: number
  lastSearch?: CatalogProduct[]
  lastCompare?: CatalogProduct[]
  lastOrderPreview?: AgentOrderPreview
  lastOrderProductIds?: string[]
}

// ---------------------------------------------------------------------------
// OpenAI tool schemas — deliberately small.
// ---------------------------------------------------------------------------
export const TOOL_SCHEMAS = [
  {
    type: 'function' as const,
    function: {
      name: 'search_products',
      description:
        "Search this merchant's catalog. Returns a short list of in-stock candidates. Use for any discovery request.",
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'free-text description of what the shopper wants' },
          category: { type: 'string' },
          color: { type: 'string' },
          size: { type: 'string' },
          style: { type: 'string', description: 'e.g. "smart casual", "formal"' },
          occasion: { type: 'string', description: 'e.g. "dinner", "wedding"' },
          gender: { type: 'string' },
          min_price: { type: 'number', description: 'in dollars' },
          max_price: { type: 'number', description: 'in dollars' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'check_inventory',
      description:
        'Real stock for a product, optionally narrowed to a size and/or colour. Returns per-location counts for multi-location merchants.',
      parameters: {
        type: 'object',
        properties: {
          product_id: { type: 'string' },
          size: { type: 'string' },
          color: { type: 'string' },
        },
        required: ['product_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'compare_products',
      description:
        'Authoritative facts (description, brand, style, material, care, price, stock) for one or more products already shown. Use for "tell me more about X" and "what is the difference between X and Y". You write the prose; the UI shows a table when there are 2+.',
      parameters: {
        type: 'object',
        properties: {
          product_ids: { type: 'array', items: { type: 'string' }, minItems: 1 },
        },
        required: ['product_ids'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_order_preview',
      description:
        'Deterministic purchase preview. The backend calculates all money. Call once the shopper has chosen product(s), size and colour.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                product_id: { type: 'string' },
                size: { type: 'string' },
                color: { type: 'string' },
                quantity: { type: 'integer', minimum: 1 },
              },
              required: ['product_id'],
            },
          },
          fulfillment: { type: 'string', enum: ['delivery', 'pickup'] },
          location: { type: 'string', description: 'pickup location name' },
        },
        required: ['items'],
      },
    },
  },
]

// ---------------------------------------------------------------------------
// Executors
// ---------------------------------------------------------------------------
type Args = Record<string, unknown>
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : undefined)

function compactProduct(p: CatalogProduct, currency: string) {
  const colors = [...new Set(p.variants.map((v) => v.color).filter(Boolean))]
  const sizes = [...new Set(p.variants.map((v) => v.size).filter(Boolean))]
  return {
    id: p.id,
    name: p.name,
    brand: p.brand ?? undefined,
    category: p.category ?? undefined,
    style: p.style ?? undefined,
    price: fmtMoney(p.priceCents, currency),
    colors: colors.length ? colors : undefined,
    sizes: sizes.length ? sizes : undefined,
    in_stock: totalStock(p) > 0,
  }
}

export async function executeTool(
  name: string,
  rawArgs: Args,
  ctx: ToolContext,
): Promise<unknown> {
  switch (name) {
    case 'search_products': {
      const all = await ctx.catalog.all()
      const ranked = rankProducts(
        all,
        {
          query: str(rawArgs.query),
          category: str(rawArgs.category),
          color: str(rawArgs.color),
          size: str(rawArgs.size),
          style: str(rawArgs.style),
          occasion: str(rawArgs.occasion),
          gender: str(rawArgs.gender),
          minPriceCents:
            num(rawArgs.min_price) != null
              ? Math.round((num(rawArgs.min_price) as number) * 100)
              : undefined,
          maxPriceCents:
            num(rawArgs.max_price) != null
              ? Math.round((num(rawArgs.max_price) as number) * 100)
              : undefined,
        },
        8,
      )
      ctx.lastSearch = ranked
      return {
        count: ranked.length,
        recommend_at_most: ctx.recommendationLimit,
        products: ranked.map((p) => compactProduct(p, ctx.currency)),
      }
    }

    case 'check_inventory': {
      const id = str(rawArgs.product_id)
      if (!id) return { error: 'product_id required' }
      const [product] = await ctx.catalog.byIds([id])
      if (!product) return { error: 'product not found' }
      const size = str(rawArgs.size)?.toLowerCase()
      const color = str(rawArgs.color)?.toLowerCase()
      const variants = product.variants.filter(
        (v) =>
          (!size || v.size?.toLowerCase() === size) &&
          (!color || v.color?.toLowerCase() === color),
      )
      const byLoc = ctx.catalog.locations
        .map((loc) => ({
          location: loc.name,
          quantity: variants.reduce(
            (s, v) => s + (v.stockByLocation[loc.id] ?? 0),
            0,
          ),
        }))
        .filter((l) => l.quantity > 0)
      const total = byLoc.reduce((s, l) => s + l.quantity, 0)
      return {
        product: product.name,
        matched_variants: variants.map((v) => variantLabel(v)),
        total,
        in_stock: total > 0,
        ...(ctx.catalog.multiLocation ? { by_location: byLoc } : {}),
      }
    }

    case 'compare_products': {
      const ids = Array.isArray(rawArgs.product_ids)
        ? (rawArgs.product_ids as unknown[]).filter((x): x is string => typeof x === 'string')
        : []
      const products = await ctx.catalog.byIds(ids)
      ctx.lastCompare = products
      return {
        products: products.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description ?? undefined,
          price: fmtMoney(p.priceCents, ctx.currency),
          brand: p.brand ?? undefined,
          style: p.style ?? undefined,
          material: p.material ?? undefined,
          care: p.care ?? undefined,
          category: p.category ?? undefined,
          gender: p.gender ?? undefined,
          sizes: [...new Set(p.variants.map((v) => v.size).filter(Boolean))],
          colors: [...new Set(p.variants.map((v) => v.color).filter(Boolean))],
          in_stock: totalStock(p) > 0,
        })),
      }
    }

    case 'create_order_preview': {
      const items = Array.isArray(rawArgs.items) ? (rawArgs.items as Args[]) : []
      const fulfillment =
        rawArgs.fulfillment === 'pickup' ? 'pickup' : 'delivery'
      const location = str(rawArgs.location) ?? null

      const ids = items
        .map((it) => str(it.product_id))
        .filter((x): x is string => !!x)
      const products = await ctx.catalog.byIds(ids)
      const byId = new Map(products.map((p) => [p.id, p]))

      const lines: AgentOrderPreview['lines'] = []
      let allInStock = true

      for (const it of items) {
        const p = byId.get(str(it.product_id) ?? '')
        if (!p) {
          allInStock = false
          continue
        }
        const size = str(it.size)?.toLowerCase()
        const color = str(it.color)?.toLowerCase()
        const variant =
          p.variants.find(
            (v) =>
              (!size || v.size?.toLowerCase() === size) &&
              (!color || v.color?.toLowerCase() === color),
          ) ?? p.variants[0]
        const qty = Math.max(1, Math.round(num(it.quantity) ?? 1))
        const unit = variant?.priceCents ?? p.priceCents
        if (!variant || variantStock(variant) < qty) allInStock = false
        lines.push({
          name: p.name,
          variant: variant ? variantLabel(variant) : null,
          quantity: qty,
          unitPriceCents: unit,
          lineTotalCents: unit * qty,
        })
      }

      const subtotal = lines.reduce((s, l) => s + l.lineTotalCents, 0)
      const delivery = fulfillment === 'delivery' ? DELIVERY_FEE_CENTS : 0
      const preview: AgentOrderPreview = {
        lines,
        subtotalCents: subtotal,
        deliveryCents: delivery,
        totalCents: subtotal + delivery,
        currency: ctx.currency,
        fulfillment,
        location,
        allInStock,
      }
      ctx.lastOrderPreview = preview
      ctx.lastOrderProductIds = [...new Set(ids)]
      return {
        lines: lines.map((l) => ({
          item: `${l.name}${l.variant ? ` (${l.variant})` : ''} x${l.quantity}`,
          line_total: fmtMoney(l.lineTotalCents, ctx.currency),
        })),
        subtotal: fmtMoney(subtotal, ctx.currency),
        delivery: fmtMoney(delivery, ctx.currency),
        total: fmtMoney(subtotal + delivery, ctx.currency),
        all_in_stock: allInStock,
        note: 'Show this preview to the shopper. They must press Confirm & Pay themselves.',
      }
    }

    default:
      return { error: `unknown tool: ${name}` }
  }
}
