import type { StoreLocation } from '../lib/database.types'

/**
 * The downloadable CSV template. Kept dependency-free (no PapaParse, no api.ts)
 * so both CatalogPage and the import page can offer the download without pulling
 * the import engine into their bundle.
 */

/** Stock column name(s) for a store: `stock` when single-location, else one
 *  `stock_<slugified name>` per location. */
export function stockColumnsFor(locations: StoreLocation[]): string[] {
  return locations.length > 1
    ? locations.map(
        (l) => `stock_${l.name.trim().toLowerCase().replace(/\s+/g, '_')}`,
      )
    : ['stock']
}

/** RFC-4180 field escape: wrap in quotes when it contains a comma, quote or newline. */
function esc(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

/** Header row + a worked example: one product, 2 colours × 3 sizes. CRLF-terminated. */
export function templateCsv(locations: StoreLocation[]): string {
  const stockCols = stockColumnsFor(locations)
  const headers = [
    'sku',
    'name',
    'price',
    'category',
    'brand',
    'style',
    'gender',
    'material',
    'care',
    'description',
    'image_url',
    'status',
    'size',
    'color',
    'color_hex',
    'variant_sku',
    ...stockCols,
  ]

  const row = (
    size: string,
    color: string,
    colorHex: string,
    vsku: string,
    stock: number,
    /** the first row of the product carries the shared product fields */
    full: boolean,
  ) =>
    [
      'LB-001',
      full ? 'Linen Blazer' : '',
      full ? '129' : '',
      full ? 'Blazers' : '',
      full ? 'Kairo' : '',
      full ? 'Smart casual' : '',
      full ? 'Mens' : '',
      full ? '100% linen' : '',
      full ? 'Dry clean only' : '',
      full ? 'Relaxed-fit linen blazer with a natural shoulder.' : '',
      full ? 'https://example.com/linen-blazer.jpg' : '',
      full ? 'active' : '',
      size,
      color,
      colorHex,
      vsku,
      ...stockCols.map(() => String(stock)),
    ]
      .map(esc)
      .join(',')

  const rows = [
    row('S', 'Oatmeal', '#E3D7BF', 'LB-001-S-OAT', 2, true),
    row('M', 'Oatmeal', '#E3D7BF', 'LB-001-M-OAT', 4, false),
    row('L', 'Oatmeal', '#E3D7BF', 'LB-001-L-OAT', 1, false),
    row('S', 'Navy', '#26314A', 'LB-001-S-NVY', 3, false),
    row('M', 'Navy', '#26314A', 'LB-001-M-NVY', 5, false),
    row('L', 'Navy', '#26314A', 'LB-001-L-NVY', 2, false),
  ]
  return [headers.join(','), ...rows].join('\r\n') + '\r\n'
}
