import { useEffect, useMemo, useRef, useState } from 'react'
import { sendAgentMessage } from '../../agent/client'
import {
  emptyContext,
  type AgentBranding,
  type AgentContext,
  type ChatTurn,
  type AgentProductCard,
  type AgentCart,
  type AgentOrderConfirmation,
} from '../../agent/types'
import { formatMoney } from '../../merchant/money'
import { ChatMessage, TypingDots, type Turn } from './ChatMessage'
import { OrderPreview, type BuyerDetails } from './OrderPreview'
import { ProductDetailModal, type CardSelection } from './ProductCards'

const HISTORY_LIMIT = 8

/** picks per assistant turn, keyed by turn index → product id → line */
type SelectionByTurn = Record<number, Record<string, CardSelection>>

function variantText(sel: CardSelection): string {
  const bits = [sel.size, sel.color].filter(Boolean).join(' ')
  return bits ? ` (${bits})` : ''
}

/** One row in the "Current cart" box — a mirror of the agent's server-side bag. */
type CartItem = {
  productId: string
  name: string
  variantLabel: string | null
  size: string | null
  color: string | null
  quantity: number
  stockQuantity: number
  imageUrl: string | null
}

/** Same shape, exported for hosts that render the cart themselves (see onCartChange). */
export type CartLineView = CartItem

function newConversationId() {
  try {
    return crypto.randomUUID()
  } catch {
    return `c_${Date.now()}_${Math.random().toString(36).slice(2)}`
  }
}

export function AgentChat({
  agentId,
  authToken,
  embedKey,
  className = '',
  cartPlacement = 'header',
  onCartChange,
  onMinimize,
}: {
  agentId: string
  /** Only for the merchant's own preview of a not-yet-published agent. */
  authToken?: string
  /** Embed key from the iframe URL (?k=). Passed on every request. */
  embedKey?: string
  className?: string
  /**
   * 'header' — the cart is a hover/click popover under the "Cart" chip in the top bar.
   * 'external' — no cart UI; the host gets the rows via onCartChange and shows them
   * itself (the merchant Preview page's side rail).
   */
  cartPlacement?: 'header' | 'external'
  onCartChange?: (items: CartLineView[]) => void
  /** When set, a "−" button in the header calls this (floating-launcher pattern). */
  onMinimize?: () => void
}) {
  const conversationId = useMemo(() => newConversationId(), [])
  const [branding, setBranding] = useState<AgentBranding | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])
  const [context, setContext] = useState<AgentContext>(emptyContext())
  const [status, setStatus] = useState<'init' | 'ready' | 'thinking'>('init')
  const [fatal, setFatal] = useState<
    { kind: 'forbidden' | 'other'; message: string } | null
  >(null)
  const [input, setInput] = useState('')
  // Per-turn product-card picks: the shopper sets qty/size/colour on the cards,
  // then "Add N to bag" sends one combined message the agent turns into
  // add_to_cart calls.
  const [selections, setSelections] = useState<SelectionByTurn>({})
  const [confirmedTurns, setConfirmedTurns] = useState<Set<number>>(new Set())
  // The product whose big read-only detail modal is open.
  const [detail, setDetail] = useState<AgentProductCard | null>(null)
  // The "Current cart" box — mirrors the agent's server-side bag after each turn.
  const [cart, setCart] = useState<CartItem[]>([])
  const [pendingCartQuantities, setPendingCartQuantities] = useState<Record<string, number>>({})
  // Pins the top-bar cart popover open on click (it also opens on hover / focus).
  const [cartOpen, setCartOpen] = useState(false)
  // The Checkout panel (top-right) holds the payment flow; the in-chat copy is
  // summary-only so payment can't be started from two places.
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutCancelledKey, setCheckoutCancelledKey] = useState<string | null>(null)
  const [checkoutRequested, setCheckoutRequested] = useState(false)
  // Card details live here so they survive the panel remounting when the order
  // changes (e.g. the shopper edits the cart after entering their card).
  const [buyer, setBuyer] = useState<BuyerDetails>({
    name: '',
    card: '',
    expiry: '',
    cvc: '',
  })
  const scrollRef = useRef<HTMLDivElement>(null)

  // The order to pay = the most recent turn that carries one.
  const orderTurnIdx = turns.findLastIndex((t) => Boolean(t.orderPreview))
  const candidateOrder =
    orderTurnIdx >= 0
      ? {
          preview: turns[orderTurnIdx].orderPreview!,
          token: turns[orderTurnIdx].orderDraftToken,
          key: String(orderTurnIdx),
        }
      : null
  const orderMatchesCart = candidateOrder
    ? (() => {
        const expected = candidateOrder.preview.lines
          .map((line) => `${line.name}|${line.variant ?? ''}|${line.quantity}`)
          .sort()
        const actual = cart
          .map((line) => `${line.name}|${line.variantLabel ?? ''}|${line.quantity}`)
          .sort()
        return expected.length === actual.length && expected.every((line, i) => line === actual[i])
      })()
    : false
  const activeOrder =
    candidateOrder &&
    orderMatchesCart &&
    checkoutCancelledKey !== candidateOrder.key
      ? candidateOrder
      : null

  // open the conversation (no model call server-side)
  useEffect(() => {
    let active = true
    sendAgentMessage(
      { agentId, conversationId, embedKey, messages: [], context: emptyContext() },
      authToken,
    ).then((res) => {
      if (!active) return
      if (!res.ok) {
        setFatal({
          kind: res.error === 'forbidden' ? 'forbidden' : 'other',
          message: res.message,
        })
        return
      }
      setBranding(res.agent)
      setContext(res.context)
      setTurns([{ role: 'assistant', text: res.message }])
      setStatus('ready')
    })
    return () => {
      active = false
    }
  }, [agentId, conversationId, authToken, embedKey])

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [turns, status])

  // Hand the cart rows to a host that renders the box itself (cartPlacement="external").
  // Let a host render the cart itself (merchant Preview side rail).
  useEffect(() => {
    onCartChange?.(cart)
  }, [cart, onCartChange])

  // Open a newly-created order preview only when the shopper explicitly requested
  // checkout. Normal chat activity must not interrupt the shopping conversation.
  const orderKey = activeOrder?.key
  useEffect(() => {
    if (!orderKey || !checkoutRequested) return
    setCheckoutOpen(true)
    setCheckoutRequested(false)
  }, [orderKey, checkoutRequested])

  const agentName = branding?.agentName ?? 'StyleSelf'

  /** Reconcile the box with the agent's server bag after a chat turn. */
  function syncCartFromReply(
    serverCart: AgentCart | undefined,
    knownProducts: AgentProductCard[],
  ) {
    const imgById = new Map(knownProducts.map((p) => [p.id, p.imageUrl]))
    setCart((local) =>
      (serverCart?.items ?? []).map((it) => ({
        productId: it.productId,
        name: it.name,
        variantLabel: it.variantLabel,
        size: it.size,
        color: it.color,
        quantity: it.quantity,
        stockQuantity: it.stockQuantity,
        imageUrl:
          imgById.get(it.productId) ??
          local.find((l) => l.productId === it.productId)?.imageUrl ??
          null,
      })),
    )
  }

  async function send(text: string) {
    const q = text.trim()
    if (!q || status === 'thinking' || status === 'init') return
    if (activeOrder) {
      setCheckoutCancelledKey(activeOrder.key)
      setCheckoutOpen(false)
    }
    setCheckoutRequested(false)
    setInput('')
    const nextTurns: Turn[] = [...turns, { role: 'user', text: q }]
    setTurns(nextTurns)
    setStatus('thinking')

    const history: ChatTurn[] = nextTurns
      .slice(-HISTORY_LIMIT)
      .map((t) => ({ role: t.role, content: t.text }))

    const res = await sendAgentMessage(
      { agentId, conversationId, embedKey, messages: history, context },
      authToken,
    )

    if (!res.ok) {
      if (res.error === 'forbidden') {
        setFatal({ kind: 'forbidden', message: res.message })
        return
      }
      setTurns((t) => [...t, { role: 'assistant', text: res.message }])
      setStatus('ready')
      return
    }
    setContext(res.context)
    if (res.agent) setBranding(res.agent)
    const known = [
      ...nextTurns.flatMap((t) => t.products ?? []),
      ...(res.products ?? []),
    ]
    syncCartFromReply(res.cart, known)
    setTurns((t) => [
      ...t,
      {
        role: 'assistant',
        text: res.message,
        products: res.products,
        comparison: res.comparison,
        cart: res.cart,
        orderPreview: res.orderPreview,
        orderDraftToken: res.orderDraftToken,
      },
    ])
    setStatus('ready')
  }

  function handlePaid(order: AgentOrderConfirmation) {
    setContext((c) => ({ ...c, cart: [], selectedProductIds: [] }))
    setCart([])
    setTurns((t) => [
      ...t,
      {
        role: 'assistant',
        text: `Payment received — order ${order.orderId} is confirmed. Anything else I can help you find?`,
      },
    ])
  }

  function selectCard(turnIdx: number, productId: string, next: CardSelection | null) {
    setSelections((prev) => {
      const forTurn = { ...(prev[turnIdx] ?? {}) }
      if (next) forTurn[productId] = next
      else delete forTurn[productId]
      return { ...prev, [turnIdx]: forTurn }
    })
  }

  function confirmCards(turnIdx: number) {
    const turn = turns[turnIdx]
    const picks = selections[turnIdx] ?? {}
    if (!turn?.products) return
    const parts = turn.products
      .filter((p) => picks[p.id]?.quantity > 0)
      .map((p) => {
        const s = picks[p.id]
        return `${s.quantity}x ${p.name}${variantText(s)}`
      })
    if (parts.length === 0) return
    setConfirmedTurns((prev) => new Set(prev).add(turnIdx))
    setDetail(null)
    send(`Add ${parts.join(', ')} to my bag`)
  }

  // Close the detail modal on Escape.
  useEffect(() => {
    if (!detail) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetail(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [detail])

  if (fatal) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 rounded-[18px] border border-line-strong bg-surface p-8 text-center ${className}`}
      >
        {fatal.kind === 'forbidden' ? (
          <>
            <span
              aria-hidden
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8f3a24]/10 text-lg text-[#8f3a24]"
            >
              ⚠
            </span>
            <p className="font-display text-lg text-ink">Invalid embed key</p>
            <p className="max-w-xs text-sm text-muted">
              This <code>?k=</code> key doesn’t match the store. Re-copy the embed
              code from the Deploy page and update it on your site.
            </p>
          </>
        ) : (
          <>
            <p className="font-display text-lg text-ink">Agent unavailable</p>
            <p className="max-w-xs text-sm text-muted">{fatal.message}</p>
          </>
        )}
      </div>
    )
  }

  const suggestions = [
    'Something smart casual under $150',
    'What do you have for a formal dinner?',
  ]
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0)
  const stockByVariant = new Map<string, number>(
    turns.flatMap((turn) => turn.products ?? []).flatMap((product) =>
      (product.variantStock ?? []).map((variant) => [
        `${product.id}|${variant.size ?? ''}|${variant.color ?? ''}`,
        variant.quantity,
      ]),
    ),
  )

  function cartItemKey(item: CartItem): string {
    return `${item.productId}|${item.size ?? ''}|${item.color ?? ''}`
  }

  function changeCartQuantity(item: CartItem, quantity: number) {
    const max = item.stockQuantity ?? stockByVariant.get(cartItemKey(item)) ?? 0
    if (!Number.isFinite(quantity)) return
    const next = Math.max(0, Math.min(max, Math.round(quantity)))
    setPendingCartQuantities((current) => ({ ...current, [cartItemKey(item)]: next }))
  }

  function confirmCartQuantity(item: CartItem) {
    const key = cartItemKey(item)
    const next = pendingCartQuantities[key]
    if (next == null || next === item.quantity) return
    setCart((current) =>
      next === 0
        ? current.filter((line) => cartItemKey(line) !== key)
        : current.map((line) =>
            cartItemKey(line) === key ? { ...line, quantity: next } : line,
          ),
    )
    setPendingCartQuantities((current) => {
      const updated = { ...current }
      delete updated[key]
      return updated
    })
    send(
      `Set the quantity of ${item.name}${item.variantLabel ? ` (${item.variantLabel})` : ''} to ${next}`,
    )
  }

  function clearCart() {
    if (cart.length === 0 || status !== 'ready') return
    setCart([])
    setPendingCartQuantities({})
    setCheckoutOpen(false)
    setCheckoutRequested(false)
    if (activeOrder) setCheckoutCancelledKey(activeOrder.key)
    send('Remove every item from my cart')
  }

  function startCheckout() {
    if (cartCount > 0) {
      if (activeOrder) {
        setCheckoutCancelledKey(activeOrder.key)
        setCheckoutOpen(false)
      }
      send('I am ready to checkout and pay for my bag')
      setCheckoutRequested(true)
    }
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex h-full flex-col overflow-hidden rounded-[18px] border border-line-strong bg-surface shadow-[0_30px_70px_-45px_rgba(23,21,15,0.3)]">
        <div className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-3">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          <span className="font-display text-sm text-ink">{agentName}</span>
          {branding && (
            <span className="ml-auto text-[0.7rem] text-muted">
              {branding.branchName
                ? `${branding.storeName} · ${branding.branchName}`
                : branding.storeName}
              {branding.preview && ' · preview'}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            {activeOrder && (
              <button
                type="button"
                onClick={() => setCheckoutOpen((open) => !open)}
                aria-expanded={checkoutOpen}
                aria-controls="agent-checkout"
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold text-paper shadow-sm transition-colors ${
                  checkoutOpen ? 'bg-ink' : 'bg-accent hover:bg-ink'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full bg-paper ${
                    checkoutOpen ? '' : 'animate-pulse'
                  }`}
                />
                {checkoutOpen ? 'Hide' : 'Checkout'}
                <span className="font-display">
                  {formatMoney(
                    activeOrder.preview.totalCents,
                    activeOrder.preview.currency,
                  )}
                </span>
              </button>
            )}
            {cartPlacement === 'external' ? (
              <span className="rounded-full border border-line-strong px-2.5 py-0.5 text-[0.65rem] text-muted">
                Cart {cartCount}
              </span>
            ) : (
              <div
                className="group relative"
                onMouseLeave={() => setCartOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setCartOpen((open) => !open)}
                  aria-expanded={cartOpen}
                  aria-label={`Cart, ${cartCount} item${cartCount === 1 ? '' : 's'}`}
                  className="rounded-full border border-line-strong px-2.5 py-0.5 text-[0.65rem] text-muted transition-colors hover:border-ink hover:text-ink"
                >
                  Cart {cartCount}
                </button>

                <div
                  role="region"
                  aria-label="Current cart"
                  className={`invisible absolute right-0 top-full z-50 mt-2 w-64 origin-top-right -translate-y-1 rounded-xl border border-line-strong bg-surface p-2.5 opacity-0 shadow-[0_20px_50px_-20px_rgba(23,21,15,0.4)] transition-[opacity,transform] duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 ${
                    cartOpen ? '!visible !translate-y-0 !opacity-100' : ''
                  }`}
                >
                  <div className="flex items-center justify-between px-1">
                    <p className="eyebrow text-[0.55rem]">Current cart</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[0.62rem] text-muted">
                        {cartCount} item{cartCount === 1 ? '' : 's'}
                      </span>
                      {cart.length > 0 && (
                        <button
                          type="button"
                          onClick={clearCart}
                          disabled={status !== 'ready'}
                          className="rounded-md border border-line-strong px-1.5 py-0.5 text-[0.62rem] font-medium text-muted transition-colors hover:border-ink hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Clear cart
                        </button>
                      )}
                    </div>
                  </div>
                  {cart.length === 0 ? (
                    <p className="px-1 py-2 text-[0.72rem] text-muted">
                      Your cart is empty.
                    </p>
                  ) : (
                    <ul className="mt-1.5 max-h-56 divide-y divide-line overflow-y-auto">
                      {cart.map((item) => {
                        const key = cartItemKey(item)
                        const draftQuantity = pendingCartQuantities[key] ?? item.quantity
                        const maxQuantity = item.stockQuantity ?? stockByVariant.get(key) ?? 0
                        const changed = draftQuantity !== item.quantity
                        return (
                        <li
                          key={key}
                          className="px-1 py-1.5 text-[0.72rem]"
                        >
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="truncate text-ink">
                              {item.name}
                              {item.variantLabel ? (
                                <span className="text-muted"> · {item.variantLabel}</span>
                              ) : null}
                            </span>
                            <span className="shrink-0 text-muted">× {item.quantity}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5">
                            <button
                              type="button"
                              aria-label={`Decrease ${item.name} quantity`}
                              onClick={() => changeCartQuantity(item, draftQuantity - 1)}
                              disabled={status !== 'ready' || draftQuantity <= 0}
                              className="h-5 w-5 rounded border border-line-strong text-xs text-ink disabled:opacity-40"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={0}
                              max={maxQuantity}
                              value={draftQuantity}
                              onChange={(e) => changeCartQuantity(item, Number(e.target.value))}
                              aria-label={`Quantity for ${item.name}`}
                              disabled={status !== 'ready'}
                              className="w-9 rounded border border-line-strong bg-surface px-1 py-0.5 text-center text-[0.65rem] text-ink"
                            />
                            <button
                              type="button"
                              aria-label={`Increase ${item.name} quantity`}
                              onClick={() => changeCartQuantity(item, draftQuantity + 1)}
                              disabled={status !== 'ready' || draftQuantity >= maxQuantity}
                              className="h-5 w-5 rounded border border-line-strong text-xs text-ink disabled:opacity-40"
                            >
                              +
                            </button>
                            <span className="text-[0.62rem] text-muted">in bag</span>
                          </div>
                          {changed && (
                            <button
                              type="button"
                              onClick={() => confirmCartQuantity(item)}
                              disabled={status !== 'ready'}
                              className="mt-1 rounded-full bg-ink px-2 py-1 text-[0.62rem] font-medium text-paper disabled:opacity-50"
                            >
                              Confirm change
                            </button>
                          )}
                        </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}
            {onMinimize && (
              <button
                type="button"
                onClick={onMinimize}
                aria-label="Minimise the chat"
                title="Minimise"
                className="ml-0.5 rounded-full p-1 text-muted transition-colors hover:bg-black/[0.04] hover:text-ink"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                  <path
                    d="M3 7h8"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {activeOrder && (
          <div
            id="agent-checkout"
            aria-hidden={!checkoutOpen}
            className={`absolute right-2 top-[3.75rem] z-40 max-h-[calc(100%-4.75rem)] w-[19rem] max-w-[calc(100%-1rem)] origin-top-right overflow-y-auto rounded-xl shadow-[0_24px_60px_-24px_rgba(23,21,15,0.45)] transition-[opacity,transform] duration-200 ease-out ${
              checkoutOpen
                ? 'translate-y-0 scale-100 opacity-100'
                : 'pointer-events-none -translate-y-2 scale-95 opacity-0'
            }`}
          >
            <OrderPreview
              key={activeOrder.key}
              agentId={agentId}
              conversationId={conversationId}
              orderDraftToken={activeOrder.token}
              preview={activeOrder.preview}
              authToken={authToken}
              embedKey={embedKey}
              buyer={buyer}
              onBuyerChange={(patch) => setBuyer((b) => ({ ...b, ...patch }))}
              onPaid={handlePaid}
            />
          </div>
        )}

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
        >
          {status === 'init' ? (
            <TypingDots />
          ) : (
            turns.map((turn, i) => (
              <ChatMessage
                key={i}
                turn={turn}
                agentName={agentName}
                agentId={agentId}
                conversationId={conversationId}
                authToken={authToken}
                busy={status !== 'ready'}
                cardSelection={selections[i]}
                cardConfirmed={confirmedTurns.has(i)}
                onCardSelect={(pid, next) => selectCard(i, pid, next)}
                onCardConfirm={() => confirmCards(i)}
                onAskDetails={(name) => send(`Tell me more about the ${name}`)}
                onOpenDetail={(product) => setDetail(product)}
              />
            ))
          )}
          {status === 'thinking' && <TypingDots />}
        </div>

        <div className="shrink-0 border-t border-line p-3">
          {turns.length <= 1 && status === 'ready' && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-line-strong px-2.5 py-1 text-[0.7rem] text-muted transition-colors hover:border-ink hover:text-ink"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={startCheckout}
              disabled={status !== 'ready' || cartCount === 0}
              title="Ask the agent to check out"
              className="flex shrink-0 items-center gap-1.5 self-stretch rounded-full border border-line-strong px-3 text-[0.7rem] font-semibold text-ink transition-colors hover:border-ink hover:bg-black/[0.03] disabled:opacity-40"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              Checkout
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe what you're looking for…"
              className="field-input !py-2 !text-sm"
              disabled={status === 'init'}
            />
            <button
              type="submit"
              className="btn btn-primary shrink-0 !px-4 !py-2 text-sm"
              disabled={status !== 'ready' || !input.trim()}
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {detail && (
        <ProductDetailModal product={detail} onClose={() => setDetail(null)} />
      )}
    </div>
  )
}
