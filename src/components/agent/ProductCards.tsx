import type { AgentProductCard } from '../../agent/types'
import { formatMoney } from '../../merchant/money'

export function ProductCards({
  products,
  onAdd,
}: {
  products: AgentProductCard[]
  onAdd?: (product: AgentProductCard) => void
}) {
  if (products.length === 0) return null
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} onAdd={onAdd} />
      ))}
    </div>
  )
}

function ProductCard({
  product,
  onAdd,
}: {
  product: AgentProductCard
  onAdd?: (product: AgentProductCard) => void
}) {
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border bg-surface ${
        product.recommended ? 'border-ink' : 'border-line'
      }`}
    >
      <div className="relative flex aspect-[4/5] items-center justify-center bg-accent-soft/50">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="font-display text-lg text-accent/60">
            {product.name.slice(0, 1)}
          </span>
        )}
        {product.recommended && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-ink px-2 py-0.5 text-[0.6rem] font-medium text-paper">
            Top pick
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-2">
        {product.brand && (
          <p className="text-[0.6rem] uppercase tracking-[0.1em] text-muted">
            {product.brand}
          </p>
        )}
        <p className="text-xs font-medium leading-tight text-ink">
          {product.name}
        </p>
        <p className="mt-auto pt-1 text-xs text-muted">
          {formatMoney(product.priceCents, product.currency)}
          {!product.inStock && (
            <span className="ml-1 text-[#8f3a24]">· out of stock</span>
          )}
        </p>
        {onAdd && (
          <button
            type="button"
            onClick={() => onAdd(product)}
            disabled={!product.inStock}
            className="btn btn-secondary mt-2 !px-2 !py-1 text-[0.68rem]"
          >
            Add to cart
          </button>
        )}
      </div>
    </div>
  )
}
