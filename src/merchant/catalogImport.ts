import type { CsvRow } from './csv'
import { parseMoney } from './money'
import type { ProductStatus, StoreLocation } from '../lib/database.types'
import {
  createProduct,
  createVariant,
  setInventory,
  updateProduct,
  updateVariant,
  type ProductWithVariants,
} from './api'

// Re-exported for callers that import it from here; the implementation lives in
// a dependency-free module so pages can offer the download without this engine.
export { templateCsv, stockColumnsFor } from './catalogTemplate'

/**
 * Catalog CSV import — pure planning + orchestrated apply.
 *
 * Model (matches the DB): one CSV row = one *variant*. Rows are grouped by
 * `sku` (→ `products.merchant_sku`) into products. Per-branch stock comes from
 * `stock` (single location) or `stock_<location name>` columns.
 *
 * Reconciliation:
 *  - `sku` present in the catalog  → UPDATE that product; match variants by
 *    (size, colour), update or add. Stock is set to the number in the file.
 *  - `sku` new                     → CREATE the product (needs name + price).
 *  - A product / variant / stock cell absent from the file is left untouched —
 *    the import never deletes or archives.
 *
 * Missing columns and blank cells are ignored (the existing value is kept);
 * only a non-blank cell writes.
 */

// ---------------------------------------------------------------------------
// Column vocabulary
// ---------------------------------------------------------------------------
export const REQUIRED_HEADERS = ['sku'] as const
/** Recognised product-level columns (besides sku). */
export const PRODUCT_HEADERS = [
  'name',
  'price',
  'description',
  'brand',
  'category',
  'style',
  'gender',
  'material',
  'care',
  'image_url',
  'status',
] as const
/** Recognised variant-level columns. */
export const VARIANT_HEADERS = ['size', 'color', 'variant_sku'] as const

const STATUSES: ProductStatus[] = ['active', 'draft', 'archived']

// ---------------------------------------------------------------------------
// Plan shapes
// ---------------------------------------------------------------------------
export type PlannedVariant = {
  size: string | null
  color: string | null
  variantSku: string | null
  /** locationId → quantity, only for locations named in the file */
  stockByLocation: Record<string, number>
  /** true when this (size,colour) already exists on the product */
  existing: boolean
  existingVariantId?: string
}

export type PlannedProduct = {
  mode: 'create' | 'update'
  merchantSku: string
  /** the matched catalog product, when mode === 'update' */
  productId?: string
  /** product fields present in the file (already cleaned) */
  fields: Record<string, string>
  /** resolved price in cents, when `price` was in the file */
  priceCents?: number
  status?: ProductStatus
  variants: PlannedVariant[]
  /** source CSV line numbers, for error messages */
  sourceLines: number[]
}

export type ImportPlan = {
  creates: PlannedProduct[]
  updates: PlannedProduct[]
  /** blocking problems — these SKUs are skipped */
  errors: string[]
  /** non-blocking notes */
  warnings: string[]
  /** stock column headers in the file that matched no known location */
  unmatchedStockColumns: string[]
}

export type ImportResult = {
  createdProducts: number
  updatedProducts: number
  createdVariants: number
  updatedVariants: number
  stockCellsWritten: number
  failures: { merchantSku: string; message: string }[]
}

// ---------------------------------------------------------------------------
// Planning (no writes)
// ---------------------------------------------------------------------------
type RowWithLine = { row: CsvRow; line: number }

export function planImport(
  csvRows: CsvRow[],
  headers: string[],
  existingProducts: ProductWithVariants[],
  locations: StoreLocation[],
): ImportPlan {
  const errors: string[] = []
  const warnings: string[] = []

  const headerSet = new Set(headers)
  if (!headerSet.has('sku')) {
    return {
      creates: [],
      updates: [],
      errors: ['The file needs a "sku" column — it is the key used to match products.'],
      warnings: [],
      unmatchedStockColumns: [],
    }
  }

  // Resolve stock columns → location ids.
  const stockCols = headers.filter((h) => h === 'stock' || h.startsWith('stock_'))
  const locByName = new Map(
    locations.map((l) => [l.name.trim().toLowerCase(), l.id]),
  )
  const primaryLocation =
    locations.find((l) => l.is_primary) ?? locations[0] ?? null
  const stockColToLocation = new Map<string, string>()
  const unmatchedStockColumns: string[] = []
  for (const col of stockCols) {
    if (col === 'stock') {
      if (primaryLocation) stockColToLocation.set(col, primaryLocation.id)
      else unmatchedStockColumns.push(col)
      continue
    }
    const name = col.slice('stock_'.length).replace(/_/g, ' ')
    const id = locByName.get(name.trim().toLowerCase())
    if (id) stockColToLocation.set(col, id)
    else unmatchedStockColumns.push(col)
  }
  if (unmatchedStockColumns.length) {
    warnings.push(
      `Ignored stock column(s) with no matching location: ${unmatchedStockColumns.join(
        ', ',
      )}. Location names on this store: ${
        locations.map((l) => l.name).join(', ') || '(none)'
      }.`,
    )
  }

  // Group rows by sku, preserving first-seen order.
  const groups = new Map<string, RowWithLine[]>()
  csvRows.forEach((row, i) => {
    const sku = (row.sku ?? '').trim()
    const line = i + 2 // 1-based + header row
    if (!sku) {
      errors.push(`Row ${line}: missing sku — skipped.`)
      return
    }
    const list = groups.get(sku) ?? []
    list.push({ row, line })
    groups.set(sku, list)
  })

  const bySku = new Map(
    existingProducts
      .filter((p) => p.merchant_sku)
      .map((p) => [p.merchant_sku as string, p]),
  )

  const creates: PlannedProduct[] = []
  const updates: PlannedProduct[] = []

  for (const [sku, rows] of groups) {
    const existing = bySku.get(sku)
    const sourceLines = rows.map((r) => r.line)

    // Product fields: first non-blank value seen across the group's rows.
    const fields: Record<string, string> = {}
    for (const key of PRODUCT_HEADERS) {
      if (!headerSet.has(key)) continue
      for (const { row } of rows) {
        const v = (row[key] ?? '').trim()
        if (v) {
          fields[key] = v
          break
        }
      }
    }

    let priceCents: number | undefined
    if (fields.price != null) {
      const cents = parseMoney(fields.price)
      if (cents == null) {
        errors.push(
          `SKU ${sku} (row ${sourceLines[0]}): price "${fields.price}" is not a valid number — skipped.`,
        )
        continue
      }
      priceCents = cents
    }
    delete fields.price // handled separately

    let status: ProductStatus | undefined
    if (fields.status != null) {
      const s = fields.status.toLowerCase() as ProductStatus
      if (STATUSES.includes(s)) status = s
      else
        warnings.push(
          `SKU ${sku}: status "${fields.status}" not one of ${STATUSES.join(
            '/',
          )} — left unchanged.`,
        )
    }
    delete fields.status

    // Variants.
    const existingVariants = existing?.variants ?? []
    const plannedVariants: PlannedVariant[] = []
    for (const { row, line } of rows) {
      const size = headerSet.has('size') ? (row.size ?? '').trim() || null : null
      const color = headerSet.has('color')
        ? (row.color ?? '').trim() || null
        : null
      const variantSku = headerSet.has('variant_sku')
        ? (row.variant_sku ?? '').trim() || null
        : null

      // A row with no size AND no color contributes only product fields — unless
      // the product genuinely has a single default variant.
      const hasVariantDimension = size !== null || color !== null
      const isOnlyRow = rows.length === 1

      const stockByLocation: Record<string, number> = {}
      for (const [col, locId] of stockColToLocation) {
        const raw = (row[col] ?? '').trim()
        if (raw === '') continue
        const n = Number(raw)
        if (!Number.isFinite(n) || n < 0) {
          warnings.push(
            `SKU ${sku} (row ${line}): stock "${raw}" in ${col} is not a non-negative number — ignored.`,
          )
          continue
        }
        stockByLocation[locId] = Math.round(n)
      }

      if (!hasVariantDimension && !isOnlyRow && Object.keys(stockByLocation).length === 0) {
        // pure product-detail row, nothing variant-specific — skip silently
        continue
      }

      const match = existingVariants.find(
        (v) =>
          (v.size ?? '').toLowerCase() === (size ?? '').toLowerCase() &&
          (v.color ?? '').toLowerCase() === (color ?? '').toLowerCase(),
      )

      plannedVariants.push({
        size,
        color,
        variantSku,
        stockByLocation,
        existing: !!match,
        existingVariantId: match?.id,
      })
    }

    if (existing) {
      updates.push({
        mode: 'update',
        merchantSku: sku,
        productId: existing.id,
        fields,
        priceCents,
        status,
        variants: plannedVariants,
        sourceLines,
      })
    } else {
      // New product — needs a name and a price.
      const missing: string[] = []
      if (!fields.name) missing.push('name')
      if (priceCents == null) missing.push('price')
      if (missing.length) {
        errors.push(
          `SKU ${sku} (row ${sourceLines[0]}): new product is missing ${missing.join(
            ' and ',
          )} — skipped.`,
        )
        continue
      }
      creates.push({
        mode: 'create',
        merchantSku: sku,
        fields,
        priceCents,
        status,
        variants: plannedVariants,
        sourceLines,
      })
    }
  }

  return { creates, updates, errors, warnings, unmatchedStockColumns }
}

// ---------------------------------------------------------------------------
// Apply (writes, sequential so RLS errors surface per-SKU)
// ---------------------------------------------------------------------------
const ATTR_KEYS = [
  'description',
  'brand',
  'style',
  'gender',
  'material',
  'care',
  'category',
] as const

export async function applyImport(
  plan: ImportPlan,
  ctx: { storeId: string; currency: string; locationId: string | null },
): Promise<ImportResult> {
  const result: ImportResult = {
    createdProducts: 0,
    updatedProducts: 0,
    createdVariants: 0,
    updatedVariants: 0,
    stockCellsWritten: 0,
    failures: [],
  }

  const attrPatch = (fields: Record<string, string>) => {
    const patch: Record<string, string> = {}
    for (const k of ATTR_KEYS) if (fields[k]) patch[k] = fields[k]
    return patch
  }

  const writeVariants = async (
    productId: string,
    variants: PlannedVariant[],
  ) => {
    for (const v of variants) {
      let variantId = v.existingVariantId
      if (variantId) {
        const patch: Record<string, string> = {}
        if (v.variantSku) patch.sku = v.variantSku
        if (Object.keys(patch).length) await updateVariant(variantId, patch)
        result.updatedVariants++
      } else if (v.size !== null || v.color !== null) {
        const created = await createVariant({
          productId,
          size: v.size,
          color: v.color,
          sku: v.variantSku ?? undefined,
        })
        variantId = created.id
        result.createdVariants++
      } else {
        // no dimension and not existing — nothing to create
        continue
      }
      for (const [locId, qty] of Object.entries(v.stockByLocation)) {
        await setInventory(variantId, locId, qty)
        result.stockCellsWritten++
      }
    }
  }

  for (const p of plan.creates) {
    try {
      const product = await createProduct({
        storeId: ctx.storeId,
        locationId: ctx.locationId,
        merchantSku: p.merchantSku,
        name: p.fields.name,
        priceCents: p.priceCents as number,
        currency: ctx.currency,
        imageUrl: p.fields.image_url || undefined,
        status: p.status,
        ...attrPatch(p.fields),
      })
      result.createdProducts++
      await writeVariants(product.id, p.variants)
    } catch (err) {
      result.failures.push({
        merchantSku: p.merchantSku,
        message: err instanceof Error ? err.message : 'create failed',
      })
    }
  }

  for (const p of plan.updates) {
    try {
      const patch: Record<string, unknown> = { ...attrPatch(p.fields) }
      if (p.fields.name) patch.name = p.fields.name
      if (p.fields.image_url) patch.image_url = p.fields.image_url
      if (p.priceCents != null) patch.price_cents = p.priceCents
      if (p.status) patch.status = p.status
      if (Object.keys(patch).length) {
        await updateProduct(p.productId as string, patch)
      }
      result.updatedProducts++
      await writeVariants(p.productId as string, p.variants)
    } catch (err) {
      result.failures.push({
        merchantSku: p.merchantSku,
        message: err instanceof Error ? err.message : 'update failed',
      })
    }
  }

  return result
}
