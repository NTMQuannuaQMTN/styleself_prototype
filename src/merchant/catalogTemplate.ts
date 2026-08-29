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

/** Header row + one worked example (a 3-variant product), CRLF-terminated. */
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
    'variant_sku',
    ...stockCols,
  ]

  const row = (
    size: string,
    color: string,
    vsku: string,
    stock: number,
    full: boolean,
  ) =>
    [
      'LB-001',
      full ? 'Linen Blazer' : '',
      full ? '129' : '',
      full ? 'Blazers' : '',
      full ? 'Urban Thread' : '',
      full ? 'Smart casual' : '',
      full ? 'Mens' : '',
      full ? '100% linen' : '',
      full ? 'Dry clean only' : '',
      full ? 'Relaxed-fit oatmeal linen blazer, half-lined.' : '',
      full ? 'https://example.com/linen-blazer.jpg' : '',
      full ? 'active' : '',
      size,
      color,
      vsku,
      ...stockCols.map(() => String(stock)),
    ].join(',')

  const rows = [
    row('S', 'Oatmeal', 'LB-001-S-OAT', 2, true),
    row('M', 'Oatmeal', 'LB-001-M-OAT', 4, false),
    row('L', 'Oatmeal', 'LB-001-L-OAT', 1, false),
  ]
  return [headers.join(','), ...rows].join('\r\n') + '\r\n'
}
