import type { AgentCart, AgentOrderPreview, CartLine } from '../../src/agent/types'
import {
  rankProducts,
  totalStock,
  type Catalog,
  type CatalogProduct,
  type CatalogVariant,
} from './catalog'

const DELIVERY_FEE_CENTS = 500

/** Structured, backend-resolved draft the runtime signs into an order token. */
export type OrderDraft = {
  items: {
    productId: string
    variantId: string
    size: string | null
    color: string | null
    quantity: number
    unitPriceCents: number
  }[]
  fulfillment: 'delivery' | 'pickup'
  locationId: string | null
  locationName: string | null
  subtotalCents: number
  feesCents: number
  totalCents: number
  currency: string
}

export function fmtMoney(cents: number, currency: string): string {
  const amount = cents / 100
  const s = amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)
  return currency === 'USD' ? `$${s}` : `${s} ${currency}`
}

export function variantLabel(v: { size: string | null; color: string | null }): string {
  return [v.size, v.color].filter(Boolean).join(' / ') || 'One size'
}

export function variantStock(v: CatalogVariant): number {
  return Object.values(v.stockByLocation).reduce((a, b) => a + b, 0)
}

/** Best variant match for a product given an optional size / colour. */
export function resolveVariant(
  p: CatalogProduct,
  size: string | null,
  color: string | null,
): CatalogVariant | null {
  const s = size?.trim().toLowerCase()
  const c = color?.trim().toLowerCase()
  const matches = p.variants.filter(
    (v) =>
      (!s || v.size?.toLowerCase() === s) &&
      (!c || v.color?.toLowerCase() === c),
  )
  if (matches.length === 0) return null
  // prefer an in-stock match
  return matches.find((v) => variantStock(v) > 0) ?? matches[0]
}

export type ToolContext = {
  catalog: Catalog
  currency: string
  recommendationLimit: number
  /** Live bag — seeded from the echoed context, re-validated, mutated by add_to_cart. */
  cart: CartLine[]
  cartChanged: boolean
  lastSearch?: CatalogProduct[]
  /** true when the last search only found near-matches, not an exact one */
  lastSearchWeak?: boolean
  lastCompare?: CatalogProduct[]
  lastDetails?: CatalogProduct[]
  lastOrderPreview?: AgentOrderPreview
  lastOrderDraft?: OrderDraft
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
      name: 'get_product_details',
      description:
        'Authoritative facts (description, brand, style, material, care, price, sizes, colours, stock) for one or more products already shown. Use for "tell me more about X" and "what is the difference between X and Y". You write the prose; the UI shows a comparison table when there are 2+.',
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
      name: 'add_to_cart',
      description:
        "Add a product to the shopper's bag once they have committed to a specific item, size and colour. Validates the variant and stock. Call again to change quantity (quantity 0 removes it).",
      parameters: {
        type: 'object',
        properties: {
          product_id: { type: 'string' },
          size: { type: 'string' },
          color: { type: 'string' },
          quantity: { type: 'integer', minimum: 0, description: 'defaults to 1; 0 removes' },
        },
        required: ['product_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_order_preview',
      description:
        "Deterministic purchase preview. The backend calculates all money. Call when the shopper is ready to buy — uses the bag, or pass items to buy directly. Do not call for casual interest.",
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            description: 'optional — omit to use the current bag',
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
          location: { type: 'string', description: 'pickup / stock location name' },
        },
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
      const { products: ranked, weak } = rankProducts(
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
      ctx.lastSearchWeak = weak
      return {
        count: ranked.length,
        recommend_at_most: ctx.recommendationLimit,
        exact_match: !weak,
        ...(weak
          ? {
              note: "Nothing closely matches that request. These are the nearest in-stock options — tell the shopper you don't carry an exact match and recommend the closest one.",
            }
          : {}),
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

    case 'get_product_details':
    case 'compare_products': {
      const ids = Array.isArray(rawArgs.product_ids)
        ? (rawArgs.product_ids as unknown[]).filter((x): x is string => typeof x === 'string')
        : []
      const products = await ctx.catalog.byIds(ids)
      // Accumulate across calls in a turn so two single-id lookups still yield a
      // 2-product comparison table (models sometimes call this once per product).
      const merged = [...(ctx.lastDetails ?? [])]
      for (const p of products) {
        if (!merged.some((m) => m.id === p.id)) merged.push(p)
      }
      ctx.lastCompare = merged
      ctx.lastDetails = merged
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

    case 'add_to_cart': {
      const id = str(rawArgs.product_id)
      if (!id) return { error: 'product_id required' }
      const [p] = await ctx.catalog.byIds([id])
      if (!p) return { error: 'product not found' }

      const size = str(rawArgs.size) ?? null
      const color = str(rawArgs.color) ?? null
      const wantQty =
        num(rawArgs.quantity) === 0 ? 0 : Math.max(0, Math.round(num(rawArgs.quantity) ?? 1))
      const variant = resolveVariant(p, size, color)

      if (wantQty === 0) {
        ctx.cart = ctx.cart.filter(
          (l) => l.productId !== id || (variant ? l.variantId !== variant.id : false),
        )
        ctx.cartChanged = true
        return { removed: true, bag_size: bagSize(ctx.cart) }
      }

      if (!variant) {
        return {
          error: 'no variant matches that size/colour — ask the shopper to choose',
          available_sizes: [...new Set(p.variants.map((v) => v.size).filter(Boolean))],
          available_colors: [...new Set(p.variants.map((v) => v.color).filter(Boolean))],
        }
      }
      const stock = variantStock(variant)
      if (stock < 1) return { error: `${p.name} (${variantLabel(variant)}) is out of stock` }

      const qty = Math.min(wantQty, stock)
      const existing = ctx.cart.find((l) => l.variantId === variant.id)
      if (existing) existing.quantity = qty
      else
        ctx.cart.push({
          productId: id,
          variantId: variant.id,
          size: variant.size,
          color: variant.color,
          quantity: qty,
        })
      ctx.cartChanged = true

      return {
        added: {
          name: p.name,
          variant: variantLabel(variant),
          quantity: qty,
          unit_price: fmtMoney(variant.priceCents ?? p.priceCents, ctx.currency),
        },
        bag_size: bagSize(ctx.cart),
        ...(qty < wantQty ? { note: `Only ${stock} in stock — added ${qty}.` } : {}),
      }
    }

    case 'create_order_preview': {
      const explicit = Array.isArray(rawArgs.items) ? (rawArgs.items as Args[]) : []
      const fulfillment = rawArgs.fulfillment === 'pickup' ? 'pickup' : 'delivery'
      const locationName = str(rawArgs.location) ?? null
      const locationId = ctx.catalog.locationIdByName(locationName)

      type Want = { productId: string; size: string | null; color: string | null; quantity: number }
      const wants: Want[] = explicit.length
        ? explicit
            .map((it) => ({
              productId: str(it.product_id) ?? '',
              size: str(it.size) ?? null,
              color: str(it.color) ?? null,
              quantity: Math.max(1, Math.round(num(it.quantity) ?? 1)),
            }))
            .filter((w) => w.productId)
        : ctx.cart.map((l) => ({
            productId: l.productId,
            size: l.size,
            color: l.color,
            quantity: Math.max(1, l.quantity),
          }))

      if (wants.length === 0) {
        return { error: 'the bag is empty — add an item first with add_to_cart' }
      }

      const products = await ctx.catalog.byIds([...new Set(wants.map((w) => w.productId))])
      const byId = new Map(products.map((p) => [p.id, p]))

      const lines: AgentOrderPreview['lines'] = []
      const draftItems: OrderDraft['items'] = []
      let allInStock = true

      for (const w of wants) {
        const p = byId.get(w.productId)
        if (!p) {
          allInStock = false
          continue
        }
        const variant = resolveVariant(p, w.size, w.color) ?? p.variants[0]
        const unit = variant?.priceCents ?? p.priceCents
        const atLoc = variant && locationId ? (variant.stockByLocation[locationId] ?? 0) : 0
        const stockOk = variant ? variantStock(variant) >= w.quantity : false
        if (!variant || !stockOk || (locationId && atLoc < w.quantity && fulfillment === 'pickup')) {
          allInStock = false
        }
        lines.push({
          name: p.name,
          variant: variant ? variantLabel(variant) : null,
          quantity: w.quantity,
          unitPriceCents: unit,
          lineTotalCents: unit * w.quantity,
        })
        if (variant) {
          draftItems.push({
            productId: p.id,
            variantId: variant.id,
            size: variant.size,
            color: variant.color,
            quantity: w.quantity,
            unitPriceCents: unit,
          })
        }
      }

      const subtotal = lines.reduce((s, l) => s + l.lineTotalCents, 0)
      const delivery = fulfillment === 'delivery' ? DELIVERY_FEE_CENTS : 0

      ctx.lastOrderPreview = {
        lines,
        subtotalCents: subtotal,
        deliveryCents: delivery,
        totalCents: subtotal + delivery,
        currency: ctx.currency,
        fulfillment,
        location: locationName,
        allInStock,
      }
      ctx.lastOrderDraft = {
        items: draftItems,
        fulfillment,
        locationId,
        locationName,
        subtotalCents: subtotal,
        feesCents: delivery,
        totalCents: subtotal + delivery,
        currency: ctx.currency,
      }
      ctx.lastOrderProductIds = [...new Set(draftItems.map((d) => d.productId))]

      return {
        lines: lines.map((l) => ({
          item: `${l.name}${l.variant ? ` (${l.variant})` : ''} x${l.quantity}`,
          line_total: fmtMoney(l.lineTotalCents, ctx.currency),
        })),
        subtotal: fmtMoney(subtotal, ctx.currency),
        delivery: fmtMoney(delivery, ctx.currency),
        total: fmtMoney(subtotal + delivery, ctx.currency),
        all_in_stock: allInStock,
        note: 'The preview card is shown. The shopper reviews, verifies identity, and presses Confirm & Pay themselves.',
      }
    }

    default:
      return { error: `unknown tool: ${name}` }
  }
}

function bagSize(cart: CartLine[]): number {
  return cart.reduce((s, l) => s + l.quantity, 0)
}

/** Re-validate a client-echoed bag against live data: drop unknowns, clamp to stock. */
export async function sanitizeCart(
  cart: CartLine[],
  catalog: Catalog,
): Promise<CartLine[]> {
  if (!Array.isArray(cart) || cart.length === 0) return []
  const ids = [...new Set(cart.map((l) => l?.productId).filter(Boolean))]
  const products = await catalog.byIds(ids)
  const byId = new Map(products.map((p) => [p.id, p]))
  const out: CartLine[] = []
  for (const line of cart) {
    const p = line && byId.get(line.productId)
    if (!p) continue
    const variant =
      p.variants.find((v) => v.id === line.variantId) ??
      resolveVariant(p, line.size ?? null, line.color ?? null)
    if (!variant) continue
    const stock = variantStock(variant)
    if (stock < 1) continue
    const qty = Math.min(Math.max(1, Math.round(line.quantity || 1)), stock)
    if (out.some((l) => l.variantId === variant.id)) continue
    out.push({
      productId: p.id,
      variantId: variant.id,
      size: variant.size,
      color: variant.color,
      quantity: qty,
    })
  }
  return out
}

/** Bag summary for the UI, resolved from live product data. */
export async function buildCartSummary(
  cart: CartLine[],
  catalog: Catalog,
  currency: string,
): Promise<AgentCart | null> {
  if (cart.length === 0) return null
  const products = await catalog.byIds([...new Set(cart.map((l) => l.productId))])
  const byId = new Map(products.map((p) => [p.id, p]))
  const items = cart
    .map((l) => {
      const p = byId.get(l.productId)
      if (!p) return null
      const variant = p.variants.find((v) => v.id === l.variantId)
      return {
        productId: p.id,
        name: p.name,
        variantLabel: variant ? variantLabel(variant) : null,
        quantity: l.quantity,
        unitPriceCents: variant?.priceCents ?? p.priceCents,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
  if (items.length === 0) return null
  return {
    items,
    subtotalCents: items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0),
    currency,
  }
}
