import { useState } from 'react'
import type { AgentOrderPreview } from '../../agent/types'
import { formatMoney } from '../../merchant/money'

export function OrderPreview({ preview }: { preview: AgentOrderPreview }) {
  const [confirmed, setConfirmed] = useState(false)
  const money = (c: number) => formatMoney(c, preview.currency)

  return (
    <div className="rounded-xl border border-line-strong bg-surface p-3.5">
      <p className="eyebrow text-[0.58rem]">Purchase review</p>

      <div className="mt-2 space-y-1.5 border-b border-line pb-2.5">
        {preview.lines.map((line, i) => (
          <div key={i} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-ink">
              {line.name}
              {line.variant ? (
                <span className="text-muted"> · {line.variant}</span>
              ) : null}
              {line.quantity > 1 ? (
                <span className="text-muted"> × {line.quantity}</span>
              ) : null}
            </span>
            <span className="shrink-0 text-ink">{money(line.lineTotalCents)}</span>
          </div>
        ))}
      </div>

      <dl className="mt-2.5 space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd className="text-ink">{money(preview.subtotalCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">
            {preview.fulfillment === 'pickup'
              ? `Pickup${preview.location ? ` · ${preview.location}` : ''}`
              : 'Delivery'}
          </dt>
          <dd className="text-ink">{money(preview.deliveryCents)}</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-1.5 font-medium">
          <dt className="text-ink">Total</dt>
          <dd className="font-display text-ink">{money(preview.totalCents)}</dd>
        </div>
      </dl>

      {!preview.allInStock && (
        <p className="mt-2 text-xs text-[#8f3a24]">
          Some items may be low or out of stock — the agent can suggest an
          alternative.
        </p>
      )}

      {confirmed ? (
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
          <span aria-hidden>✓</span> Payment confirmed — simulated for the MVP.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmed(true)}
          disabled={!preview.allInStock}
          className="btn btn-primary mt-3 w-full !py-2.5 text-sm"
        >
          Confirm &amp; Pay {money(preview.totalCents)}
        </button>
      )}
      <p className="mt-1.5 text-center text-[0.68rem] text-muted">
        Identity check &amp; Visa authorization run here in a later phase.
      </p>
    </div>
  )
}
