import type { AgentProductCard } from '../../agent/types'
import { formatMoney } from '../../merchant/money'
import { swatchColor } from '../../agent/swatch'

type ColorOption = NonNullable<AgentProductCard['colors']>[number]

/** One shopper-chosen line, keyed by product id. Lives in AgentChat. */
export type CardSelection = { quantity: number; size: string | null; color: string | null }

export type ProductCardsProps = {
  products: AgentProductCard[]
  /** current picks for THIS message block, by product id */
  selection: Record<string, CardSelection>
  onSelect: (productId: string, next: CardSelection | null) => void
  onConfirm: () => void
  onAskDetails: (productName: string) => void
  /** open the big detail modal for a product */
  onOpenDetail: (product: AgentProductCard) => void
  /** true once the shopper has sent this block's picks to the agent */
  confirmed: boolean
  /** disable every control while the agent is replying */
  busy: boolean
}

function money(p: AgentProductCard) {
  return formatMoney(p.priceCents, p.currency)
}

export function ProductCards({
  products,
  selection,
  onSelect,
  onConfirm,
  onAskDetails,
  onOpenDetail,
  confirmed,
  busy,
}: ProductCardsProps) {
  if (products.length === 0) return null

  const hero = products.find((p) => p.recommended) ?? products[0]
  // hero first, then the rest in their given order
  const ordered = [hero, ...products.filter((p) => p.id !== hero.id)]

  const picked = products.filter(
    (p) => selection[p.id] && selection[p.id].quantity > 0,
  )
  const totalCents = picked.reduce(
    (s, p) => s + p.priceCents * selection[p.id].quantity,
    0,
  )
  const unitCount = picked.reduce((s, p) => s + selection[p.id].quantity, 0)

  const single = ordered.length === 1

  return (
    <div className="space-y-2.5">
      <div
        className={
          single
            ? ''
            : '-mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-1.5 [scrollbar-width:thin]'
        }
      >
        {ordered.map((p) => (
          <StripCard
            key={p.id}
            product={p}
            wide={single}
            sel={selection[p.id] ?? null}
            onSelect={(next) => onSelect(p.id, next)}
            onOpenDetail={() => onOpenDetail(p)}
            onAskDetails={() => onAskDetails(p.name)}
            disabled={busy || confirmed}
          />
        ))}
      </div>

      {!single && ordered.length > 2 && (
        <p className="px-1 text-[0.62rem] text-muted">Scroll for more →</p>
      )}

      {picked.length > 0 && !confirmed && (
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="flex w-full items-center justify-between gap-3 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-transform hover:-translate-y-px disabled:opacity-50"
        >
          <span>
            Add {unitCount} {unitCount === 1 ? 'item' : 'items'} to bag
          </span>
          <span className="text-paper/70">{formatMoney(totalCents, picked[0].currency)}</span>
        </button>
      )}

      {confirmed && picked.length > 0 && (
        <p className="px-1 text-[0.7rem] text-muted">Added to your bag — see the assistant’s reply below.</p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */

function ImageBox({
  product,
  className = '',
  onClick,
}: {
  product: AgentProductCard
  className?: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative block overflow-hidden bg-accent-soft/50 ${className}`}
      aria-label={`View ${product.name}`}
    >
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt=""
          className={`h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03] ${
            product.stockLevel === 'out' ? 'opacity-40 grayscale' : ''
          }`}
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span className="font-display text-2xl text-accent/50">
            {product.name.slice(0, 1)}
          </span>
        </div>
      )}
      {product.recommended && (
        <span className="absolute left-2 top-2 rounded-full bg-ink px-2 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-paper">
          Top pick
        </span>
      )}
      {!product.recommended && product.nearestMatch && (
        <span className="absolute left-2 top-2 rounded-full bg-accent/90 px-2 py-0.5 text-[0.58rem] font-medium text-paper">
          Closest match
        </span>
      )}
    </button>
  )
}

function Swatches({ colors }: { colors?: ColorOption[] }) {
  if (!colors || colors.length === 0) return null
  return (
    <div className="flex items-center gap-1">
      {colors.slice(0, 5).map((c) => (
        <span
          key={c.name}
          title={c.name}
          className="h-3 w-3 rounded-full border border-line-strong"
          style={{ backgroundColor: c.hex ?? swatchColor(c.name) }}
        />
      ))}
      {colors.length > 5 && (
        <span className="text-[0.62rem] text-muted">+{colors.length - 5}</span>
      )}
    </div>
  )
}

function StockNote({ product }: { product: AgentProductCard }) {
  if (product.stockLevel === 'out')
    return <span className="text-[0.68rem] font-medium text-[#8f3a24]">Sold out</span>
  if (product.stockLevel === 'low')
    return (
      <span className="text-[0.68rem] font-medium text-accent">
        Only {product.unitsLeft} left
      </span>
    )
  return <span className="text-[0.68rem] text-success">In stock</span>
}

/* ------------------------------------------------------------------ */

/**
 * One card in the horizontal strip. Fixed width so several sit side by side and
 * the row scrolls; `wide` when it's the only product (fills the bubble instead).
 */
function StripCard({
  product,
  wide,
  sel,
  onSelect,
  onOpenDetail,
  onAskDetails,
  disabled,
}: {
  product: AgentProductCard
  wide: boolean
  sel: CardSelection | null
  onSelect: (next: CardSelection | null) => void
  onOpenDetail: () => void
  onAskDetails: () => void
  disabled: boolean
}) {
  return (
    <div
      className={`flex shrink-0 flex-col overflow-hidden rounded-xl border bg-surface ${
        sel && sel.quantity > 0 ? 'border-ink' : product.recommended ? 'border-ink/60' : 'border-line'
      } ${wide ? 'w-full' : 'w-[10.5rem] snap-start'}`}
    >
      <ImageBox
        product={product}
        onClick={onOpenDetail}
        className={wide ? 'aspect-[16/10] w-full' : 'aspect-[4/5] w-full'}
      />
      <div className="flex flex-1 flex-col gap-1 p-2">
        {product.brand && (
          <p className="text-[0.55rem] uppercase tracking-[0.1em] text-muted">
            {product.brand}
          </p>
        )}
        <button
          type="button"
          onClick={onOpenDetail}
          className="text-left text-xs font-medium leading-tight text-ink hover:underline"
        >
          {product.name}
        </button>
        <p className="text-xs font-semibold text-ink">{money(product)}</p>
        <div className="flex items-center justify-between gap-1">
          <Swatches colors={product.colors} />
          <StockNote product={product} />
        </div>
        {product.reason && (
          <p className="line-clamp-2 text-[0.66rem] leading-snug text-muted">
            {product.reason}
          </p>
        )}
        <div className="mt-auto pt-1">
          <AddControl
            product={product}
            sel={sel}
            onSelect={onSelect}
            onAskDetails={onAskDetails}
            onOpenDetail={onOpenDetail}
            disabled={disabled}
            compact
          />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

export function AddControl({
  product,
  sel,
  onSelect,
  onAskDetails,
  onOpenDetail,
  disabled,
  compact = false,
}: {
  product: AgentProductCard
  sel: CardSelection | null
  onSelect: (next: CardSelection | null) => void
  onAskDetails: () => void
  onOpenDetail?: () => void
  disabled: boolean
  compact?: boolean
}) {
  const out = product.stockLevel === 'out'
  const colors = product.colors ?? []
  const colorNames = colors.map((c) => c.name)
  const sizes = product.sizes ?? []
  const stockForSelection = (size: string | null, color: string | null) =>
    product.variantStock
      ? product.variantStock.find((v) => v.size === size && v.color === color)?.quantity ?? 0
      : product.stockQuantity ?? product.unitsLeft ?? 0

  if (out) {
    return (
      <button
        type="button"
        onClick={onAskDetails}
        disabled={disabled}
        className="w-full rounded-lg border border-line-strong py-1.5 text-[0.72rem] text-muted transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
      >
        See alternatives
      </button>
    )
  }

  if (!sel || sel.quantity <= 0) {
    return (
      <div className={compact ? 'flex flex-col gap-1' : 'flex items-center gap-2'}>
        <button
          type="button"
          onClick={() =>
            onSelect({
              quantity: Math.min(1, stockForSelection(sizes[0] ?? null, colorNames[0] ?? null)),
              size: sizes[0] ?? null,
              color: colorNames[0] ?? null,
            })
          }
          disabled={disabled}
          className="flex-1 rounded-lg bg-ink px-3 py-1.5 text-[0.74rem] font-medium text-paper transition-transform hover:-translate-y-px disabled:opacity-50"
        >
          Add
        </button>
        <button
          type="button"
          onClick={onOpenDetail ?? onAskDetails}
          disabled={disabled}
          className="rounded-lg border border-line-strong px-3 py-1.5 text-[0.72rem] text-muted transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
        >
          Details
        </button>
      </div>
    )
  }

  const patch = (p: Partial<CardSelection>) => onSelect({ ...sel, ...p })
  const maxQuantity = stockForSelection(sel.size, sel.color)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-lg border border-ink">
          <button
            type="button"
            aria-label="Decrease"
            onClick={() =>
              sel.quantity <= 1 ? onSelect(null) : patch({ quantity: sel.quantity - 1 })
            }
            disabled={disabled}
            className="px-2.5 py-1 text-sm text-ink disabled:opacity-50"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            max={maxQuantity}
            value={sel.quantity}
            onChange={(e) => {
              const next = Number(e.target.value)
              if (Number.isFinite(next)) {
                patch({ quantity: Math.max(1, Math.min(maxQuantity, Math.round(next))) })
              }
            }}
            aria-label={`Quantity for ${product.name}`}
            disabled={disabled}
            className="w-10 border-0 bg-transparent text-center text-[0.78rem] text-ink outline-none"
          />
          <button
            type="button"
            aria-label="Increase"
            onClick={() => patch({ quantity: Math.min(maxQuantity, sel.quantity + 1) })}
            disabled={disabled || sel.quantity >= maxQuantity}
            className="px-2.5 py-1 text-sm text-ink disabled:opacity-50"
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          disabled={disabled}
          className="text-[0.68rem] text-muted underline-offset-2 hover:underline disabled:opacity-50"
        >
          Remove
        </button>
      </div>

      {(sizes.length > 1 || colorNames.length > 1) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {sizes.length > 1 && (
            <select
              value={sel.size ?? ''}
              onChange={(e) => {
                const size = e.target.value || null
                patch({ size, quantity: Math.min(sel.quantity, stockForSelection(size, sel.color)) })
              }}
              disabled={disabled}
              className="rounded-md border border-line-strong bg-surface px-1.5 py-1 text-[0.7rem] text-ink"
            >
              {sizes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
          {colorNames.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-3 w-3 shrink-0 rounded-full border border-line-strong"
                style={{
                  backgroundColor:
                    colors.find((c) => c.name === sel.color)?.hex ??
                    swatchColor(sel.color ?? ''),
                }}
              />
              <select
                value={sel.color ?? ''}
                onChange={(e) => {
                  const color = e.target.value || null
                  patch({ color, quantity: Math.min(sel.quantity, stockForSelection(sel.size, color)) })
                }}
                disabled={disabled}
                className="rounded-md border border-line-strong bg-surface px-1.5 py-1 text-[0.7rem] text-ink"
              >
                {colorNames.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ================================================================== */
/*  Detail modal — rendered by AgentChat as an overlay on the widget.  */
/* ================================================================== */

export function ProductDetailModal({
  product,
  onClose,
}: {
  product: AgentProductCard
  onClose: () => void
}) {
  const colors = product.colors ?? []
  const facts: [string, string][] = []
  if (product.style) facts.push(['Style', product.style])
  if (product.material) facts.push(['Material', product.material])
  if (product.care) facts.push(['Care', product.care])
  if (product.category) facts.push(['Category', product.category])

  return (
    <div
      className="absolute inset-0 z-30 flex items-end justify-center bg-ink/40 backdrop-blur-[1px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
      onClick={onClose}
    >
      <div
        className="relative flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-line-strong bg-surface shadow-[0_30px_80px_-30px_rgba(23,21,15,0.5)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-2.5 top-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-paper/90 text-ink shadow-sm transition-colors hover:bg-paper"
        >
          ✕
        </button>

        {/* One scroll container — image scrolls away with the text. */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-accent-soft/50">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt=""
                className={`h-full w-full object-cover ${
                  product.stockLevel === 'out' ? 'opacity-40 grayscale' : ''
                }`}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <span className="font-display text-4xl text-accent/50">
                  {product.name.slice(0, 1)}
                </span>
              </div>
            )}
            {product.recommended && (
              <span className="absolute left-3 top-3 rounded-full bg-ink px-2 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-paper">
                Top pick
              </span>
            )}
          </div>

          <div className="space-y-3 p-4">
            <div className="space-y-1">
              {product.brand && (
                <p className="text-[0.62rem] uppercase tracking-[0.14em] text-muted">
                  {product.brand}
                </p>
              )}
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-lg leading-tight text-ink">{product.name}</h3>
                <p className="shrink-0 text-base font-semibold text-ink">{money(product)}</p>
              </div>
              <StockNote product={product} />
            </div>

            {product.reason && (
              <p className="rounded-lg bg-accent-soft/50 px-3 py-2 text-[0.8rem] leading-snug text-ink-soft">
                {product.reason}
              </p>
            )}

            {product.description && (
              <p className="text-[0.82rem] leading-relaxed text-ink-soft">
                {product.description}
              </p>
            )}

            {colors.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[0.62rem] uppercase tracking-[0.12em] text-muted">Colours</p>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c) => (
                    <span key={c.name} className="flex items-center gap-1.5 text-[0.75rem] text-ink-soft">
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-line-strong"
                        style={{ backgroundColor: c.hex ?? swatchColor(c.name) }}
                      />
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {product.sizes && product.sizes.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[0.62rem] uppercase tracking-[0.12em] text-muted">Sizes</p>
                <div className="flex flex-wrap gap-1.5">
                  {product.sizes.map((s) => (
                    <span
                      key={s}
                      className="rounded-md border border-line-strong px-2 py-0.5 text-[0.72rem] text-ink-soft"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {facts.length > 0 && (
              <dl className="space-y-1.5 border-t border-line pt-3 text-[0.78rem]">
                {facts.map(([k, val]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-muted">{k}</dt>
                    <dd className="text-right text-ink-soft">{val}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
