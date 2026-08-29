import Papa from 'papaparse'

/**
 * Thin wrapper over PapaParse for the catalog import. Produces a normalised
 * grid: header keys lower-cased and trimmed, every cell a trimmed string.
 * The import engine (`catalogImport.ts`) works off this shape and never touches
 * PapaParse directly.
 */

export type CsvRow = Record<string, string>

export type ParsedCsv = {
  /** Normalised header keys, in file order. */
  headers: string[]
  /** One object per data row, keyed by normalised header. */
  rows: CsvRow[]
  /** Parser-level problems (malformed quoting etc.) — not domain validation. */
  errors: string[]
}

function normaliseHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, '_')
}

export function parseCatalogCsv(text: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: normaliseHeader,
    transform: (v) => (typeof v === 'string' ? v.trim() : v),
  })

  const headers =
    result.meta.fields?.map((f) => f) ?? Object.keys(result.data[0] ?? {})

  const rows: CsvRow[] = (result.data as Record<string, string>[])
    .map((raw) => {
      const row: CsvRow = {}
      for (const key of headers) row[key] = (raw[key] ?? '').toString().trim()
      return row
    })
    // drop rows that are entirely blank
    .filter((row) => Object.values(row).some((v) => v !== ''))

  const errors = result.errors.map(
    (e) => `Row ${typeof e.row === 'number' ? e.row + 2 : '?'}: ${e.message}`,
  )

  return { headers, rows, errors }
}

/**
 * Serialise a grid back to CSV text (used for the downloadable template and for
 * exporting the current catalog). Quotes any field containing a comma, quote,
 * or newline.
 */
export function toCsv(headers: string[], rows: CsvRow[]): string {
  const esc = (v: string) =>
    /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => esc(row[h] ?? '')).join(','))
  }
  return lines.join('\r\n') + '\r\n'
}
