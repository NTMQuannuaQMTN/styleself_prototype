import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../src/lib/database.types'

/** Rich, server-only view of a product used by the tools. */
export type CatalogProduct = {
  id: string
  name: string
  description: string | null
  brand: string | null
  style: string | null
  gender: string | null
  material: string | null
  care: string | null
  category: string | null
  priceCents: number
  currency: string
  imageUrl: string | null
  variants: CatalogVariant[]
}

export type CatalogVariant = {
  id: string
  size: string | null
  color: string | null
  /** optional #RRGGBB for the storefront swatch; display-only */
  colorHex: string | null
  priceCents: number | null
  /** locationId -> quantity */
  stockByLocation: Record<string, number>
}

export type Loc = { id: string; name: string }

export type SearchFilters = {
  query?: string
  category?: string
  color?: string
  size?: string
  style?: string
  occasion?: string
  gender?: string
  minPriceCents?: number
  maxPriceCents?: number
}

export function totalStock(p: CatalogProduct): number {
  return p.variants.reduce(
    (sum, v) =>
      sum + Object.values(v.stockByLocation).reduce((a, b) => a + b, 0),
    0,
  )
}

const STOP = new Set([
  'the', 'and', 'for', 'with', 'something', 'need', 'want', 'show', 'have',
  'looking', 'under', 'below', 'over', 'about', 'some', 'that', 'this',
])

export type RankedProducts = {
  products: CatalogProduct[]
  /** true when the shopper gave criteria but even the best result barely matches */
  weak: boolean
}

/**
 * Cheap relevance ranking done in the backend — the model never sees the full
 * catalog. Attributes (style, category, colour, …) are *preferences*, not hard
 * filters: a mismatch lowers the score but never removes a product. So a request
 * for "smart casual" still returns the nearest "casual" options rather than
 * nothing. Only "out of stock" excludes; over-budget items are kept as a
 * last-resort fallback.
 */
export function rankProducts(
  products: CatalogProduct[],
  filters: SearchFilters,
  limit = 8,
): RankedProducts {
  const terms = `${filters.query ?? ''} ${filters.occasion ?? ''} ${filters.style ?? ''}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t))

  const hasCriteria =
    terms.length > 0 ||
    Boolean(filters.category || filters.style || filters.gender || filters.color || filters.size)

  const scored = products
    .filter((p) => totalStock(p) > 0)
    .map((p) => {
      const hay = [
        p.name, p.brand, p.style, p.category, p.gender, p.material,
        p.description,
        p.variants.map((v) => v.color).join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      let score = 0
      let signal = 0 // count of positive matches — used to judge "weak"
      for (const t of terms) if (hay.includes(t)) {
        score += 3
        signal++
      }

      const soft = (
        field: string | undefined,
        hs: string,
        hit: number,
        miss: number,
      ) => {
        if (!field) return 0
        if (hs.includes(field.toLowerCase())) {
          signal++
          return hit
        }
        return miss
      }
      score += soft(filters.category, p.category?.toLowerCase() ?? '', 3, -1)
      score += soft(filters.style, p.style?.toLowerCase() ?? '', 3, -1)
      score += soft(filters.gender, p.gender?.toLowerCase() ?? '', 1, -1)
      if (filters.color) {
        const colors = p.variants.map((v) => v.color?.toLowerCase() ?? '').join(' ')
        score += soft(filters.color, colors, 2, -1)
      }
      if (filters.size) {
        const sizes = p.variants.map((v) => v.size?.toLowerCase() ?? '').join(' ')
        score += soft(filters.size, sizes, 1, -1)
      }

      const overBudget =
        filters.maxPriceCents != null && p.priceCents > filters.maxPriceCents
      if (overBudget) score -= 4
      if (filters.minPriceCents != null && p.priceCents < filters.minPriceCents) {
        score -= 2
      }

      return { p, score, signal, overBudget }
    })
    .sort((a, b) => b.score - a.score || a.p.priceCents - b.p.priceCents)

  if (scored.length === 0) return { products: [], weak: false }

  // Prefer in-budget matches; only fall back to over-budget if nothing fits.
  const inBudget = scored.filter((x) => !x.overBudget)
  const pool = inBudget.length > 0 ? inBudget : scored
  const top = pool.slice(0, limit)

  return {
    products: top.map((x) => x.p),
    weak: hasCriteria && top[0].signal === 0,
  }
}

// ---------------------------------------------------------------------------
export interface Catalog {
  kind: 'db' | 'demo'
  currency: string
  locations: Loc[]
  /** true when the merchant has more than one location */
  multiLocation: boolean
  all(): Promise<CatalogProduct[]>
  byIds(ids: string[]): Promise<CatalogProduct[]>
  /** Resolve a location name to its id; falls back to the primary location. */
  locationIdByName(name: string | null): string | null
  /** Demo only — simulate the inventory decrement a real checkout RPC performs. */
  decrementStock?(variantId: string, locationId: string, qty: number): void
}

function matchLocationId(locations: Loc[], name: string | null): string | null {
  if (name) {
    const n = name.trim().toLowerCase()
    const hit = locations.find((l) => l.name.toLowerCase() === n)
    if (hit) return hit.id
    const partial = locations.find(
      (l) => l.name.toLowerCase().includes(n) || n.includes(l.name.toLowerCase()),
    )
    if (partial) return partial.id
  }
  return locations[0]?.id ?? null
}

/** Loads a real merchant's catalog. RLS on the passed client scopes visibility. */
export class DbCatalog implements Catalog {
  kind = 'db' as const
  private db: SupabaseClient<Database>
  private storeId: string
  currency: string
  locations: Loc[]

  constructor(
    db: SupabaseClient<Database>,
    storeId: string,
    currency: string,
    locations: Loc[],
  ) {
    this.db = db
    this.storeId = storeId
    this.currency = currency
    this.locations = locations
  }

  get multiLocation() {
    return this.locations.length > 1
  }

  locationIdByName(name: string | null): string | null {
    return matchLocationId(this.locations, name)
  }

  private map(rows: unknown[]): CatalogProduct[] {
    type Row = Database['public']['Tables']['products']['Row'] & {
      product_variants: (Database['public']['Tables']['product_variants']['Row'] & {
        inventory: Database['public']['Tables']['inventory']['Row'][]
      })[]
    }
    return (rows as Row[]).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      brand: p.brand,
      style: p.style,
      gender: p.gender,
      material: p.material,
      care: p.care,
      category: p.category,
      priceCents: p.price_cents,
      currency: p.currency,
      imageUrl: p.image_url,
      variants: (p.product_variants ?? []).map((v) => ({
        id: v.id,
        size: v.size,
        color: v.color,
        colorHex: v.color_hex ?? null,
        priceCents: v.price_cents,
        stockByLocation: Object.fromEntries(
          (v.inventory ?? []).map((i) => [i.location_id, i.quantity]),
        ),
      })),
    }))
  }

  async all(): Promise<CatalogProduct[]> {
    const { data, error } = await this.db
      .from('products')
      .select('*, product_variants(*, inventory(*))')
      .eq('store_id', this.storeId)
      .eq('status', 'active')
    if (error) throw new Error(error.message)
    return this.map(data ?? [])
  }

  async byIds(ids: string[]): Promise<CatalogProduct[]> {
    if (ids.length === 0) return []
    const { data, error } = await this.db
      .from('products')
      .select('*, product_variants(*, inventory(*))')
      .eq('store_id', this.storeId)
      .in('id', ids)
    if (error) throw new Error(error.message)
    return this.map(data ?? [])
  }
}

/** In-memory demo catalog for /agent/demo — real AI, no database. */
export class DemoCatalog implements Catalog {
  kind = 'demo' as const
  currency = 'USD'
  locations: Loc[] = [
    { id: 'orchard', name: 'Orchard' },
    { id: 'vivocity', name: 'VivoCity' },
    { id: 'jurong', name: 'Jurong East' },
  ]
  get multiLocation() {
    return true
  }
  // module-level array — a "sale" within a warm instance is visible on reload
  private products: CatalogProduct[] = DEMO_PRODUCTS

  async all() {
    return this.products
  }
  async byIds(ids: string[]) {
    return this.products.filter((p) => ids.includes(p.id))
  }

  locationIdByName(name: string | null): string | null {
    return matchLocationId(this.locations, name)
  }

  decrementStock(variantId: string, locationId: string, qty: number) {
    for (const p of this.products) {
      const v = p.variants.find((x) => x.id === variantId)
      if (v && v.stockByLocation[locationId] != null) {
        v.stockByLocation[locationId] = Math.max(
          0,
          v.stockByLocation[locationId] - qty,
        )
        return
      }
    }
  }
}

function v(
  id: string,
  size: string | null,
  color: string | null,
  stock: Record<string, number>,
  colorHex: string | null = null,
): CatalogVariant {
  return { id, size, color, colorHex, priceCents: null, stockByLocation: stock }
}

const DEMO_PRODUCTS: CatalogProduct[] = [
  {
    id: 'demo-linen-blazer',
    name: 'Linen Blazer',
    description:
      'Relaxed-fit oatmeal linen blazer, half-lined with a natural shoulder. Reads smart without feeling stiff.',
    brand: 'Urban Thread',
    style: 'Smart casual',
    gender: 'Mens',
    material: '100% linen',
    care: 'Dry clean',
    category: 'Blazers',
    priceCents: 8900,
    currency: 'USD',
    imageUrl: null,
    variants: [
      v('dlb-s-oat', 'S', 'Oatmeal', { orchard: 2, vivocity: 1, jurong: 0 }, '#E3D7BF'),
      v('dlb-m-oat', 'M', 'Oatmeal', { orchard: 4, vivocity: 2, jurong: 0 }, '#E3D7BF'),
      v('dlb-l-oat', 'L', 'Oatmeal', { orchard: 3, vivocity: 0, jurong: 1 }, '#E3D7BF'),
    ],
  },
  {
    id: 'demo-tailored-jacket',
    name: 'Tailored Jacket',
    description:
      'Structured navy jacket with a sharp shoulder and a clean lapel. The formal end of the rail.',
    brand: 'Urban Thread',
    style: 'Formal',
    gender: 'Mens',
    material: 'Wool blend',
    care: 'Dry clean',
    category: 'Blazers',
    priceCents: 12900,
    currency: 'USD',
    imageUrl: null,
    variants: [
      v('dtj-m-nvy', 'M', 'Navy', { orchard: 2, vivocity: 1, jurong: 0 }, '#26314A'),
      v('dtj-l-nvy', 'L', 'Navy', { orchard: 1, vivocity: 1, jurong: 0 }, '#26314A'),
    ],
  },
  {
    id: 'demo-overshirt',
    name: 'Relaxed Overshirt',
    description:
      'Lightweight taupe overshirt with chest pockets. Layer it open or button it up.',
    brand: 'Urban Thread',
    style: 'Casual',
    gender: 'Unisex',
    material: 'Cotton twill',
    care: 'Machine wash cold',
    category: 'Shirts',
    priceCents: 7200,
    currency: 'USD',
    imageUrl: null,
    variants: [
      v('dos-s-tpe', 'S', 'Taupe', { orchard: 3, vivocity: 2, jurong: 4 }, '#B8A992'),
      v('dos-m-tpe', 'M', 'Taupe', { orchard: 6, vivocity: 3, jurong: 5 }, '#B8A992'),
      v('dos-l-tpe', 'L', 'Taupe', { orchard: 2, vivocity: 1, jurong: 3 }, '#B8A992'),
    ],
  },
  {
    id: 'demo-oxford',
    name: 'Oxford Shirt',
    description:
      'Classic cotton oxford. Works under a blazer for dinner or on its own.',
    brand: 'Urban Thread',
    style: 'Smart casual',
    gender: 'Unisex',
    material: '100% cotton',
    care: 'Machine wash cold',
    category: 'Shirts',
    priceCents: 4900,
    currency: 'USD',
    imageUrl: null,
    variants: [
      v('dox-s-wht', 'S', 'White', { orchard: 8, vivocity: 6, jurong: 7 }, '#F4F1EA'),
      v('dox-m-wht', 'M', 'White', { orchard: 12, vivocity: 8, jurong: 10 }, '#F4F1EA'),
      v('dox-l-wht', 'L', 'White', { orchard: 5, vivocity: 4, jurong: 6 }, '#F4F1EA'),
      v('dox-m-blu', 'M', 'Sky Blue', { orchard: 4, vivocity: 3, jurong: 2 }, '#8FB3D9'),
    ],
  },
  {
    id: 'demo-trousers',
    name: 'Wool Trousers',
    description:
      'Charcoal tapered wool trousers with a clean drape. Smart casual to formal.',
    brand: 'Urban Thread',
    style: 'Smart casual',
    gender: 'Mens',
    material: 'Wool blend',
    care: 'Dry clean',
    category: 'Trousers',
    priceCents: 9800,
    currency: 'USD',
    imageUrl: null,
    variants: [
      v('dwt-30-chr', '30', 'Charcoal', { orchard: 3, vivocity: 2, jurong: 1 }, '#3B3A37'),
      v('dwt-32-chr', '32', 'Charcoal', { orchard: 5, vivocity: 4, jurong: 2 }, '#3B3A37'),
      v('dwt-34-chr', '34', 'Charcoal', { orchard: 4, vivocity: 3, jurong: 2 }, '#3B3A37'),
    ],
  },
]
