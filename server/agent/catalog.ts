import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../src/lib/database.types.ts'

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

/** Cheap relevance ranking done in the backend — the model never sees the full catalog. */
export function rankProducts(
  products: CatalogProduct[],
  filters: SearchFilters,
  limit = 8,
): CatalogProduct[] {
  const terms = `${filters.query ?? ''} ${filters.occasion ?? ''} ${filters.style ?? ''}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t))

  const scored = products
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
      for (const t of terms) if (hay.includes(t)) score += 2
      if (terms.length === 0) score += 1

      const hard = (field: string | undefined, hs: string) =>
        field ? (hs.includes(field.toLowerCase()) ? 1 : -3) : 0
      score += hard(filters.category, p.category?.toLowerCase() ?? '')
      score += hard(filters.style, p.style?.toLowerCase() ?? '')
      score += hard(filters.gender, p.gender?.toLowerCase() ?? '')
      if (filters.color) {
        const colors = p.variants
          .map((v) => v.color?.toLowerCase() ?? '')
          .join(' ')
        score += colors.includes(filters.color.toLowerCase()) ? 1 : -2
      }
      if (filters.size) {
        const sizes = p.variants
          .map((v) => v.size?.toLowerCase() ?? '')
          .join(' ')
        score += sizes.includes(filters.size.toLowerCase()) ? 1 : -2
      }
      if (filters.minPriceCents != null && p.priceCents < filters.minPriceCents)
        score -= 3
      if (filters.maxPriceCents != null && p.priceCents > filters.maxPriceCents)
        score -= 5

      return { p, score }
    })
    .filter((x) => x.score > 0 && totalStock(x.p) > 0)
    .sort((a, b) => b.score - a.score || a.p.priceCents - b.p.priceCents)

  return scored.slice(0, limit).map((x) => x.p)
}

// ---------------------------------------------------------------------------
export interface Catalog {
  currency: string
  locations: Loc[]
  /** true when the merchant has more than one location */
  multiLocation: boolean
  all(): Promise<CatalogProduct[]>
  byIds(ids: string[]): Promise<CatalogProduct[]>
}

/** Loads a real merchant's catalog. RLS on the passed client scopes visibility. */
export class DbCatalog implements Catalog {
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
  currency = 'USD'
  locations: Loc[] = [
    { id: 'orchard', name: 'Orchard' },
    { id: 'vivocity', name: 'VivoCity' },
    { id: 'jurong', name: 'Jurong East' },
  ]
  get multiLocation() {
    return true
  }
  private products: CatalogProduct[] = DEMO_PRODUCTS

  async all() {
    return this.products
  }
  async byIds(ids: string[]) {
    return this.products.filter((p) => ids.includes(p.id))
  }
}

function v(
  id: string,
  size: string | null,
  color: string | null,
  stock: Record<string, number>,
): CatalogVariant {
  return { id, size, color, priceCents: null, stockByLocation: stock }
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
      v('dlb-s-oat', 'S', 'Oatmeal', { orchard: 2, vivocity: 1, jurong: 0 }),
      v('dlb-m-oat', 'M', 'Oatmeal', { orchard: 4, vivocity: 2, jurong: 0 }),
      v('dlb-l-oat', 'L', 'Oatmeal', { orchard: 3, vivocity: 0, jurong: 1 }),
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
      v('dtj-m-nvy', 'M', 'Navy', { orchard: 2, vivocity: 1, jurong: 0 }),
      v('dtj-l-nvy', 'L', 'Navy', { orchard: 1, vivocity: 1, jurong: 0 }),
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
      v('dos-s-tpe', 'S', 'Taupe', { orchard: 3, vivocity: 2, jurong: 4 }),
      v('dos-m-tpe', 'M', 'Taupe', { orchard: 6, vivocity: 3, jurong: 5 }),
      v('dos-l-tpe', 'L', 'Taupe', { orchard: 2, vivocity: 1, jurong: 3 }),
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
      v('dox-s-wht', 'S', 'White', { orchard: 8, vivocity: 6, jurong: 7 }),
      v('dox-m-wht', 'M', 'White', { orchard: 12, vivocity: 8, jurong: 10 }),
      v('dox-l-wht', 'L', 'White', { orchard: 5, vivocity: 4, jurong: 6 }),
      v('dox-m-blu', 'M', 'Blue', { orchard: 4, vivocity: 3, jurong: 2 }),
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
      v('dwt-30-chr', '30', 'Charcoal', { orchard: 3, vivocity: 2, jurong: 1 }),
      v('dwt-32-chr', '32', 'Charcoal', { orchard: 5, vivocity: 4, jurong: 2 }),
      v('dwt-34-chr', '34', 'Charcoal', { orchard: 4, vivocity: 3, jurong: 2 }),
    ],
  },
]
