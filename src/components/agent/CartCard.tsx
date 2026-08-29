import type { AgentCart } from '../../agent/types'
import { formatMoney } from '../../merchant/money'

export function CartCard({ cart }: { cart: AgentCart }) {
  if (cart.items.length === 0) return null
  const money = (c: number) => formatMoney(c, cart.currency)

  return (
    <div className="rounded-xl border border-line-strong bg-surface p-3.5">
      <p className="eyebrow text-[0.58rem]">In your cart</p>
      <ul className="mt-2 space-y-1.5">
        {cart.items.map((it, i) => (
          <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-ink">
              {it.name}
              {it.variantLabel ? (
                <span className="text-muted"> · {it.variantLabel}</span>
              ) : null}
              {it.quantity > 1 ? (
                <span className="text-muted"> × {it.quantity}</span>
              ) : null}
            </span>
            <span className="shrink-0 text-ink">
              {money(it.unitPriceCents * it.quantity)}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-2.5 flex justify-between border-t border-line pt-2 text-sm">
        <span className="text-muted">Subtotal</span>
        <span className="font-display text-ink">{money(cart.subtotalCents)}</span>
      </div>
    </div>
  )
}
