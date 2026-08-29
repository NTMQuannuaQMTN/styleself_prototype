import { useState } from 'react'
import type { AgentOrderPreview } from '../../agent/types'
import { formatMoney } from '../../merchant/money'

/**
 * Post-preview checkout, entirely client-side and simulated. The card details
 * never leave the browser and are never sent to the agent or the backend — this
 * is a UX concept for the Visa Payments Stack integration, not a real charge.
 */
type Stage = 'review' | 'pay' | 'processing' | 'done'

export function OrderPreview({ preview }: { preview: AgentOrderPreview }) {
  const [stage, setStage] = useState<Stage>('review')
  const [name, setName] = useState('')
  const [card, setCard] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [auth, setAuth] = useState<{ code: string; last4: string } | null>(null)

  const money = (c: number) => formatMoney(c, preview.currency)
  const digits = card.replace(/\D/g, '')
  const brand = brandOf(digits)
  const cardOk = luhnValid(digits)
  const expiryOk = /^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)
  const cvcOk = /^\d{3,4}$/.test(cvc)
  const formOk = name.trim().length > 1 && cardOk && expiryOk && cvcOk

  function pay() {
    setStage('processing')
    // Simulated Visa authorization — no network call with card data.
    window.setTimeout(() => {
      setAuth({
        code: `VIS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        last4: digits.slice(-4),
      })
      setStage('done')
    }, 1400)
  }

  return (
    <div className="rounded-xl border border-line-strong bg-surface p-3.5">
      <div className="flex items-center justify-between">
        <p className="eyebrow text-[0.58rem]">
          {stage === 'review' ? 'Purchase review' : 'Secure checkout'}
        </p>
        <VisaMark />
      </div>

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

      {stage === 'review' && !preview.allInStock && (
        <p className="mt-2 text-xs text-[#8f3a24]">
          Some items may be low or out of stock — the agent can suggest an
          alternative.
        </p>
      )}

      {stage === 'review' && (
        <>
          <button
            type="button"
            onClick={() => setStage('pay')}
            disabled={!preview.allInStock}
            className="btn btn-primary mt-3 w-full !py-2.5 text-sm"
          >
            Confirm &amp; Pay {money(preview.totalCents)}
          </button>
          <p className="mt-1.5 text-center text-[0.68rem] text-muted">
            Card details are entered in the next step and stay in your browser.
          </p>
        </>
      )}

      {(stage === 'pay' || stage === 'processing') && (
        <form
          className="mt-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (formOk && stage === 'pay') pay()
          }}
        >
          <label className="block">
            <span className="mb-1 block text-[0.68rem] text-muted">
              Cardholder name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="cc-name"
              placeholder="Alex Tan"
              className="field-input !py-2 !text-sm"
              disabled={stage === 'processing'}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[0.68rem] text-muted">
              Card number{brand ? ` · ${brand}` : ''}
            </span>
            <input
              value={card}
              onChange={(e) => setCard(formatCard(e.target.value))}
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="4111 1111 1111 1111"
              className="field-input !py-2 font-mono !text-sm"
              disabled={stage === 'processing'}
            />
          </label>
          <div className="flex gap-2">
            <label className="block flex-1">
              <span className="mb-1 block text-[0.68rem] text-muted">Expiry</span>
              <input
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/YY"
                className="field-input !py-2 font-mono !text-sm"
                disabled={stage === 'processing'}
              />
            </label>
            <label className="block flex-1">
              <span className="mb-1 block text-[0.68rem] text-muted">CVC</span>
              <input
                value={cvc}
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="123"
                className="field-input !py-2 font-mono !text-sm"
                disabled={stage === 'processing'}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={!formOk || stage === 'processing'}
            className="btn btn-primary mt-1 w-full !py-2.5 text-sm"
          >
            {stage === 'processing'
              ? 'Authorizing with Visa…'
              : `Pay ${money(preview.totalCents)}`}
          </button>
          <p className="text-center text-[0.68rem] text-muted">
            Simulated Visa authorization — no real charge. The assistant never
            sees these details. Use a test card, e.g. 4111 1111 1111 1111.
          </p>
        </form>
      )}

      {stage === 'done' && auth && (
        <div className="mt-3 space-y-2">
          <p className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
            <span aria-hidden>✓</span> Payment authorized — card ending {auth.last4}
          </p>
          <dl className="space-y-1 text-[0.72rem] text-muted">
            <div className="flex justify-between">
              <dt>Authorization</dt>
              <dd className="font-mono text-ink-soft">{auth.code}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Amount</dt>
              <dd className="text-ink-soft">{money(preview.totalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Processor</dt>
              <dd className="text-ink-soft">Visa Payments Stack (simulated)</dd>
            </div>
          </dl>
          <p className="text-[0.68rem] text-muted">
            In production this is where the Visa Payments Stack tokenizes the card
            and settles the order. Nothing was charged.
          </p>
        </div>
      )}
    </div>
  )
}

function VisaMark() {
  return (
    <span className="rounded bg-[#1434cb] px-1.5 py-0.5 text-[0.6rem] font-bold italic tracking-wide text-white">
      VISA
    </span>
  )
}

function brandOf(digits: string): string | null {
  if (/^4/.test(digits)) return 'Visa'
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard'
  if (/^3[47]/.test(digits)) return 'Amex'
  return null
}

function luhnValid(digits: string): boolean {
  if (digits.length < 13 || digits.length > 19) return false
  let sum = 0
  let double = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i])
    if (double) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    double = !double
  }
  return sum % 10 === 0
}

function formatCard(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(.{4})/g, '$1 ')
    .trim()
}

function formatExpiry(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 4)
  return d.length <= 2 ? d : `${d.slice(0, 2)}/${d.slice(2)}`
}
