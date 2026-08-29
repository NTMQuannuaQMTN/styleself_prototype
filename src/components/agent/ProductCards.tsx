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
  confirmed,
  busy,
}: ProductCardsProps) {
  if (products.length === 0) return null

  const hero = products.find((p) => p.recommended) ?? products[0]
  const rest = products.filter((p) => p.id !== hero.id)

  const picked = products.filter(
    (p) => selection[p.id] && selection[p.id].quantity > 0,
  )
  const totalCents = picked.reduce(
    (s, p) => s + p.priceCents * selection[p.id].quantity,
    0,
  )
  const unitCount = picked.reduce((s, p) => s + selection[p.id].quantity, 0)

  return (
    <div className="space-y-2.5">
      <HeroCard
        product={hero}
        sel={selection[hero.id] ?? null}
        onSelect={(next) => onSelect(hero.id, next)}
        onAskDetails={() => onAskDetails(hero.name)}
        disabled={busy || confirmed}
      />

      {rest.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5">
          {rest.map((p) => (
            <MiniCard
              key={p.id}
              product={p}
              sel={selection[p.id] ?? null}
              onSelect={(next) => onSelect(p.id, next)}
              onAskDetails={() => onAskDetails(p.name)}
              disabled={busy || confirmed}
            />
          ))}
        </div>
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
}: {
  product: AgentProductCard
  className?: string
}) {
  return (
    <div className={`relative overflow-hidden bg-accent-soft/50 ${className}`}>
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt=""
          className={`h-full w-full object-cover ${
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
    </div>
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

function HeroCard({
  product,
  sel,
  onSelect,
  onAskDetails,
  disabled,
}: {
  product: AgentProductCard
  sel: CardSelection | null
  onSelect: (next: CardSelection | null) => void
  onAskDetails: () => void
  disabled: boolean
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink/80 bg-surface shadow-[0_16px_40px_-28px_rgba(23,21,15,0.45)]">
      <div className="flex">
        <ImageBox product={product} className="aspect-[4/5] w-2/5 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3">
          {product.brand && (
            <p className="text-[0.6rem] uppercase tracking-[0.14em] text-muted">
              {product.brand}
            </p>
          )}
          <p className="font-display text-[0.98rem] leading-tight text-ink">
            {product.name}
          </p>
          <p className="text-[0.92rem] font-semibold text-ink">{money(product)}</p>

          {product.reason && (
            <p className="text-[0.74rem] leading-snug text-ink-soft">{product.reason}</p>
          )}

          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <Swatches colors={product.colors} />
            <StockNote product={product} />
          </div>

          {(product.style || product.material) && (
            <p className="text-[0.66rem] text-muted">
              {[product.style, product.material].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-line px-3 py-2">
        <AddControl
          product={product}
          sel={sel}
          onSelect={onSelect}
          onAskDetails={onAskDetails}
          disabled={disabled}
        />
      </div>
    </div>
  )
}

function MiniCard({
  product,
  sel,
  onSelect,
  onAskDetails,
  disabled,
}: {
  product: AgentProductCard
  sel: CardSelection | null
  onSelect: (next: CardSelection | null) => void
  onAskDetails: () => void
  disabled: boolean
}) {
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border bg-surface ${
        sel && sel.quantity > 0 ? 'border-ink' : 'border-line'
      }`}
    >
      <ImageBox product={product} className="aspect-[4/5] w-full" />
      <div className="flex flex-1 flex-col gap-1 p-2">
        {product.brand && (
          <p className="text-[0.55rem] uppercase tracking-[0.1em] text-muted">
            {product.brand}
          </p>
        )}
        <p className="text-xs font-medium leading-tight text-ink">{product.name}</p>
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
            disabled={disabled}
            compact
          />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function AddControl({
  product,
  sel,
  onSelect,
  onAskDetails,
  disabled,
  compact = false,
}: {
  product: AgentProductCard
  sel: CardSelection | null
  onSelect: (next: CardSelection | null) => void
  onAskDetails: () => void
  disabled: boolean
  compact?: boolean
}) {
  const out = product.stockLevel === 'out'
  const colors = product.colors ?? []
  const colorNames = colors.map((c) => c.name)
  const sizes = product.sizes ?? []

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
              quantity: 1,
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
          onClick={onAskDetails}
          disabled={disabled}
          className="rounded-lg border border-line-strong px-3 py-1.5 text-[0.72rem] text-muted transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
        >
          Details
        </button>
      </div>
    )
  }

  const patch = (p: Partial<CardSelection>) => onSelect({ ...sel, ...p })

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
          <span className="min-w-[1.5rem] text-center text-[0.78rem] font-medium text-ink">
            {sel.quantity}
          </span>
          <button
            type="button"
            aria-label="Increase"
            onClick={() => patch({ quantity: sel.quantity + 1 })}
            disabled={disabled}
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
              onChange={(e) => patch({ size: e.target.value || null })}
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
                onChange={(e) => patch({ color: e.target.value || null })}
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
