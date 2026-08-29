import { useState } from 'react'
import type { AgentOrderConfirmation, AgentOrderPreview } from '../../agent/types'
import { authorizePayment, executePayment } from '../../agent/checkoutClient'
import { formatMoney } from '../../merchant/money'

/**
 * Post-preview checkout. The money comes from the backend preview; payment runs
 * through /api/agent/checkout (deterministic, no AI). Card details never leave
 * the browser except as a last-4 + brand for the simulated authorization.
 *
 *   review → identity (card details) → authorized → processing → done
 */
type Stage = 'review' | 'identity' | 'authorized' | 'processing' | 'done' | 'error'

export type BuyerDetails = { name: string; card: string; expiry: string; cvc: string }
const EMPTY_BUYER: BuyerDetails = { name: '', card: '', expiry: '', cvc: '' }

export function OrderPreview({
  agentId,
  conversationId,
  orderDraftToken,
  preview,
  authToken,
  embedKey,
  readOnly = false,
  buyer: buyerProp,
  onBuyerChange,
  onPaid,
}: {
  agentId: string
  conversationId: string
  orderDraftToken?: string
  preview: AgentOrderPreview
  authToken?: string
  embedKey?: string
  /** In-chat copy: show the summary only, no payment controls. */
  readOnly?: boolean
  /** Lift card details to the parent so they survive the panel remounting. */
  buyer?: BuyerDetails
  onBuyerChange?: (patch: Partial<BuyerDetails>) => void
  /** Called once payment succeeds — lets the chat clear the paid bag. */
  onPaid?: (order: AgentOrderConfirmation) => void
}) {
  const [stage, setStage] = useState<Stage>('review')
  const [localBuyer, setLocalBuyer] = useState<BuyerDetails>(EMPTY_BUYER)
  const buyer = buyerProp ?? localBuyer
  const setBuyer = (patch: Partial<BuyerDetails>) =>
    onBuyerChange
      ? onBuyerChange(patch)
      : setLocalBuyer((b) => ({ ...b, ...patch }))
  const { name, card, expiry, cvc } = buyer
  const [authorizationToken, setAuthorizationToken] = useState<string | null>(null)
  const [order, setOrder] = useState<AgentOrderConfirmation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const money = (c: number) => formatMoney(c, preview.currency)
  const digits = card.replace(/\D/g, '')
  const brand = brandOf(digits)
  const cardOk = luhnValid(digits)
  const identityOk =
    name.trim().length > 1 &&
    cardOk &&
    /^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry) &&
    /^\d{3,4}$/.test(cvc)

  const canPay = Boolean(orderDraftToken)

  const summary = (
    <>
      <div className="mt-2 space-y-1.5 border-b border-line pb-2.5">
        {preview.lines.map((line, i) => (
          <div key={i} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-ink">
              {line.name}
              {line.variant ? <span className="text-muted"> · {line.variant}</span> : null}
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
    </>
  )

  // In-chat copy — summary only, payment happens in the top-right Checkout panel.
  if (readOnly) {
    return (
      <div className="rounded-xl border border-line-strong bg-surface p-3.5">
        <div className="flex items-center justify-between">
          <p className="eyebrow text-[0.58rem]">Order ready</p>
          <VisaMark />
        </div>
        {summary}
        <p className="mt-2 text-center text-[0.68rem] text-muted">
          Review and pay in the Checkout panel — tap “Checkout” at the top.
        </p>
      </div>
    )
  }

  async function authorize() {
    if (!orderDraftToken) return
    setBusy(true)
    setError(null)
    const res = await authorizePayment(
      {
        agentId,
        conversationId,
        embedKey,
        orderDraftToken,
        buyerName: name.trim(),
        card: { last4: digits.slice(-4), brand },
      },
      authToken,
    )
    setBusy(false)
    if (res.ok && res.kind === 'authorization') {
      setAuthorizationToken(res.token)
      setStage('authorized')
    } else {
      setError('message' in res ? res.message : 'Could not authorize the payment.')
    }
  }

  async function pay() {
    if (!orderDraftToken || !authorizationToken) return
    setStage('processing')
    setError(null)
    const res = await executePayment(
      { agentId, conversationId, embedKey, orderDraftToken, authorizationToken },
      authToken,
    )
    if (res.ok && res.kind === 'order') {
      setOrder(res)
      setStage('done')
      onPaid?.(res)
    } else {
      setError('message' in res ? res.message : 'The payment could not be completed.')
      setStage('error')
    }
  }

  return (
    <div className="rounded-xl border border-line-strong bg-surface p-3.5">
      <div className="flex items-center justify-between">
        <p className="eyebrow text-[0.58rem]">
          {stage === 'review' ? 'Purchase review' : 'Secure checkout'}
        </p>
        <VisaMark />
      </div>

      {stage !== 'done' && summary}

      {stage === 'review' && (
        <>
          {!preview.allInStock && (
            <p className="mt-2 text-xs text-[#8f3a24]">
              Some items may be low or out of stock — the agent can suggest an alternative.
            </p>
          )}
          <button
            type="button"
            onClick={() => setStage('identity')}
            disabled={!canPay || !preview.allInStock}
            className="btn btn-primary mt-3 w-full !py-2.5 text-sm"
          >
            Confirm &amp; Pay {money(preview.totalCents)}
          </button>
          <p className="mt-1.5 text-center text-[0.68rem] text-muted">
            {canPay
              ? 'Card details are entered in the next step.'
              : 'Ask the assistant to prepare the order.'}
          </p>
        </>
      )}

      {stage === 'identity' && (
        <form
          className="mt-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (identityOk && !busy) authorize()
          }}
        >
          <p className="text-[0.7rem] text-muted">
            Enter your card to authorize this Visa payment. Simulated — no real charge.
          </p>
          <Field label="Cardholder name" value={name}
            onChange={(v) => setBuyer({ name: v })} placeholder="Alex Tan"
            autoComplete="cc-name" />
          <Field
            label={`Card number${brand ? ` · ${brand}` : ''}`}
            value={card}
            onChange={(v) => setBuyer({ card: formatCard(v) })}
            placeholder="4111 1111 1111 1111"
            mono
            autoComplete="cc-number"
          />
          <div className="flex gap-2">
            <Field label="Expiry" value={expiry}
              onChange={(v) => setBuyer({ expiry: formatExpiry(v) })}
              placeholder="MM/YY" mono autoComplete="cc-exp" />
            <Field label="CVC" value={cvc}
              onChange={(v) => setBuyer({ cvc: v.replace(/\D/g, '').slice(0, 4) })}
              placeholder="123" mono autoComplete="cc-csc" />
          </div>
          {error && <p className="text-xs text-[#8f3a24]">{error}</p>}
          <button
            type="submit"
            disabled={!identityOk || busy}
            className="btn btn-primary mt-1 w-full !py-2.5 text-sm"
          >
            {busy ? 'Verifying…' : 'Verify & authorize'}
          </button>
          <button
            type="button"
            onClick={() => setStage('review')}
            className="w-full text-center text-[0.68rem] text-muted underline"
          >
            Cancel
          </button>
        </form>
      )}

      {stage === 'authorized' && (
        <div className="mt-3 space-y-2">
          <p className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
            <span aria-hidden>✓</span> Card ending {card.replace(/\D/g, '').slice(-4)} authorized.
          </p>
          {error && <p className="text-xs text-[#8f3a24]">{error}</p>}
          <button type="button" onClick={pay} className="btn btn-primary w-full !py-2.5 text-sm">
            Pay {money(preview.totalCents)}
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthorizationToken(null)
              setError(null)
              setStage('identity')
            }}
            className="btn btn-secondary w-full !py-2 text-sm"
          >
            Change the details
          </button>
        </div>
      )}

      {stage === 'processing' && (
        <p className="mt-3 rounded-lg bg-paper px-3 py-2.5 text-sm text-muted">
          Authorizing with Visa…
        </p>
      )}

      {stage === 'error' && (
        <div className="mt-3 space-y-2">
          <p className="rounded-lg bg-[#8f3a24]/10 px-3 py-2 text-sm text-[#8f3a24]">
            {error ?? 'The payment could not be completed.'}
          </p>
          <button
            type="button"
            onClick={() => setStage(authorizationToken ? 'authorized' : 'identity')}
            className="btn btn-secondary w-full !py-2 text-sm"
          >
            Try again
          </button>
        </div>
      )}

      {stage === 'done' && order && (
        <div className="mt-3 space-y-2">
          <p className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
            <span aria-hidden>✓</span> {order.message}
          </p>
          <dl className="space-y-1 text-[0.72rem] text-muted">
            <div className="flex justify-between">
              <dt>Order</dt>
              <dd className="font-mono text-ink-soft">{order.orderId}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Visa authorization</dt>
              <dd className="font-mono text-ink-soft">{order.visaAuthCode}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Charged</dt>
              <dd className="text-ink-soft">{money(order.totalCents)}</dd>
            </div>
            {order.settlement ? (
              <div className="flex justify-between">
                <dt>Settles to</dt>
                <dd className="text-ink-soft">{order.settlement}</dd>
              </div>
            ) : null}
          </dl>
          <p className="text-[0.68rem] text-muted">
            Simulated Visa Payments Stack — nothing was charged. In production the card is
            tokenized and the order is settled here.
          </p>
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  mono,
  type = 'text',
  autoComplete,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  mono?: boolean
  type?: string
  autoComplete?: string
}) {
  return (
    <label className="block flex-1">
      <span className="mb-1 block text-[0.68rem] text-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`field-input !py-2 !text-sm ${mono ? 'font-mono' : ''}`}
      />
    </label>
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
  return value.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim()
}

function formatExpiry(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 4)
  return d.length <= 2 ? d : `${d.slice(0, 2)}/${d.slice(2)}`
}
