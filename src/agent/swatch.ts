/**
 * Turn a merchant's free-text colour value into (a) a display name and (b) a
 * CSS colour for the swatch dot.
 *
 * A variant's `color` is plain text. Merchants may write just a name
 * ("Oatmeal"), or a name plus a hex code ("Oatmeal #E3D7BF") — the hex wins for
 * the swatch, the name is what the shopper reads. When there's no hex we fall
 * back to a small known-colour table, then to what the browser can parse
 * ("sky blue", "sand"), and finally to a hue hashed from the name so two
 * different colours never collapse to the same grey.
 */

const KNOWN: Record<string, string> = {
  white: '#f4f1ea', ivory: '#f3efe3', cream: '#efe7d6', ecru: '#e8dfc8',
  oatmeal: '#e3d7bf', sand: '#dbc9a3', stone: '#cabfa9', beige: '#dccba8',
  taupe: '#b8a992', tan: '#c9a36b', camel: '#b07f4a', khaki: '#9a8a5c',
  brown: '#6f4a2f', chocolate: '#4a3626', charcoal: '#3b3a37', slate: '#5b6169',
  grey: '#8d8b85', gray: '#8d8b85', silver: '#c3c1ba', black: '#1c1b18',
  navy: '#26314a', indigo: '#2f3a63', 'sky blue': '#8fb3d9', blue: '#3f5a86',
  teal: '#376e6b', green: '#4b6650', olive: '#6b6a3c', sage: '#a3ad93',
  forest: '#2f4a37', mustard: '#c69a3e', yellow: '#d8b24a', gold: '#c8a45c',
  orange: '#c67b3e', rust: '#a8552f', terracotta: '#b5623f', red: '#9a3b32',
  burgundy: '#5e2b2b', maroon: '#5a2a2a', wine: '#4d2431', pink: '#d9a7ab',
  blush: '#e2c3bd', rose: '#c98a8f', lilac: '#b5a7c8', purple: '#5b466b',
  lavender: '#b9add1',
}

const HEX = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/

/** The shopper-facing label — the colour value with any trailing hex stripped. */
export function colorName(value: string): string {
  return value.replace(HEX, '').replace(/[·|,-]\s*$/, '').trim() || value.trim()
}

/** A CSS colour for the swatch dot. Always returns something sensible. */
export function swatchColor(value: string): string {
  const hex = value.match(HEX)?.[0]
  if (hex) return hex

  const name = colorName(value).toLowerCase()
  if (KNOWN[name]) return KNOWN[name]

  const lastWord = name.split(/\s+/).pop() ?? ''
  if (KNOWN[lastWord]) return KNOWN[lastWord]

  // Let the browser try: it parses "rebeccapurple", "sky blue" won't work but
  // single CSS keywords do. Guard with CSS.supports so we never emit garbage.
  const oneWord = name.replace(/\s+/g, '')
  if (typeof CSS !== 'undefined' && CSS.supports?.('color', oneWord)) return oneWord

  // Deterministic muted colour from the name so distinct colours stay distinct.
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  const hue = Math.abs(h) % 360
  return `hsl(${hue} 32% 62%)`
}
