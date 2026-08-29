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
  quantity: number
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
  className = '',
  cartPlacement = 'left',
  onCartChange,
}: {
  agentId: string
  /** Only for the merchant's own preview of a not-yet-published agent. */
  authToken?: string
  className?: string
  /**
   * 'left' — the widget renders its own floating "Current cart" box beside the chat.
   * 'external' — it renders no cart box; the host gets the rows via onCartChange
   * and shows them itself (the merchant Preview page's side rail).
   * 'preview' — the widget shows a compact cart toggle button in the header while
   * still managing its own cart state for the host preview experience.
   */
  cartPlacement?: 'left' | 'external' | 'preview'
  onCartChange?: (items: CartLineView[]) => void
}) {
  const conversationId = useMemo(() => newConversationId(), [])
  const [branding, setBranding] = useState<AgentBranding | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])
  const [context, setContext] = useState<AgentContext>(emptyContext())
  const [status, setStatus] = useState<'init' | 'ready' | 'thinking'>('init')
  const [fatal, setFatal] = useState<string | null>(null)
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
  // Keep the cart visible from the first paint; it starts empty and updates in place.
  const [cartOpen, setCartOpen] = useState(true)
  // The Checkout panel (top-right) holds the payment flow; the in-chat copy is
  // summary-only so payment can't be started from two places.
  const [checkoutOpen, setCheckoutOpen] = useState(false)
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
  const activeOrder =
    orderTurnIdx >= 0
      ? {
          preview: turns[orderTurnIdx].orderPreview!,
          token: turns[orderTurnIdx].orderDraftToken,
          key: String(orderTurnIdx),
        }
      : null

  // open the conversation (no model call server-side)
  useEffect(() => {
    let active = true
    sendAgentMessage(
      { agentId, conversationId, messages: [], context: emptyContext() },
      authToken,
    ).then((res) => {
      if (!active) return
      if (!res.ok) {
        setFatal(res.message)
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
  }, [agentId, conversationId, authToken])

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [turns, status])

  // Let a host render the cart itself (merchant Preview side rail).
  useEffect(() => {
    onCartChange?.(cart)
  }, [cart, onCartChange])

  // Whenever a new order preview appears, snap the panel shut then slide it back
  // open on the next frames — so a fresh checkout visibly replaces the old one.
  const orderKey = activeOrder?.key
  useEffect(() => {
    if (!orderKey) return
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      setCheckoutOpen(false)
      raf2 = requestAnimationFrame(() => setCheckoutOpen(true))
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [orderKey])

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
        quantity: it.quantity,
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
    setInput('')
    const nextTurns: Turn[] = [...turns, { role: 'user', text: q }]
    setTurns(nextTurns)
    setStatus('thinking')

    const history: ChatTurn[] = nextTurns
      .slice(-HISTORY_LIMIT)
      .map((t) => ({ role: t.role, content: t.text }))

    const res = await sendAgentMessage(
      { agentId, conversationId, messages: history, context },
      authToken,
    )

    if (!res.ok) {
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
        className={`flex flex-col items-center justify-center gap-2 rounded-[18px] border border-line-strong bg-surface p-8 text-center ${className}`}
      >
        <p className="font-display text-lg text-ink">Agent unavailable</p>
        <p className="max-w-xs text-sm text-muted">{fatal}</p>
      </div>
    )
  }

  const suggestions = [
    'Something smart casual under $150',
    'What do you have for a formal dinner?',
  ]
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0)
  const stockByProduct = new Map(
    turns.flatMap((turn) => turn.products ?? []).map((product) => [
      product.id,
      product.stockQuantity ?? product.unitsLeft ?? 0,
    ]),
  )

  function changeCartQuantity(item: CartItem, quantity: number) {
    const max = stockByProduct.get(item.productId) ?? 0
    if (!Number.isFinite(quantity)) return
    const next = Math.max(1, Math.min(max, Math.round(quantity)))
    setPendingCartQuantities((current) => ({ ...current, [item.productId]: next }))
  }

  function confirmCartQuantity(item: CartItem) {
    const next = pendingCartQuantities[item.productId]
    if (next == null || next === item.quantity) return
    setCart((current) => current.map((line) =>
      line.productId === item.productId ? { ...line, quantity: next } : line,
    ))
    setPendingCartQuantities((current) => {
      const updated = { ...current }
      delete updated[item.productId]
      return updated
    })
    send(
      `Set the quantity of ${item.name}${item.variantLabel ? ` (${item.variantLabel})` : ''} to ${next}`,
    )
  }

  return (
    <div className={`relative ${className}`}>
      {cartPlacement !== 'external' && (
        <aside
          id="agent-cart"
          aria-label="Current shopping cart"
          className="mb-3 w-full rounded-[18px] border border-line-strong bg-surface p-3 shadow-[0_20px_50px_-30px_rgba(23,21,15,0.35)] md:absolute md:right-full md:top-12 md:mb-0 md:mr-4 md:w-44"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="eyebrow text-[0.55rem]">Current cart</p>
            <span className="text-[0.65rem] text-muted">
              {cartCount} item{cartCount === 1 ? '' : 's'}
            </span>
          </div>
          {cart.length === 0 ? (
            <p className="mt-3 text-xs text-muted">Your cart is empty.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {cart.map((item) => (
                <div key={item.productId} className="flex gap-2">
                  <div className="h-12 w-10 shrink-0 overflow-hidden rounded border border-line bg-accent-soft/50">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 text-xs">
                    {(() => {
                      const draftQuantity = pendingCartQuantities[item.productId] ?? item.quantity
                      const changed = draftQuantity !== item.quantity
                      return (
                        <>
                    <p className="line-clamp-2 text-ink">{item.name}</p>
                    {item.variantLabel ? (
                      <p className="text-[0.65rem] text-muted">{item.variantLabel}</p>
                    ) : null}
                    <div className="mt-1 flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label={`Decrease ${item.name} quantity`}
                        onClick={() =>
                            draftQuantity <= 1
                            ? undefined
                            : changeCartQuantity(item, draftQuantity - 1)
                        }
                        disabled={status !== 'ready' || draftQuantity <= 1}
                        className="h-5 w-5 rounded border border-line-strong text-xs text-ink disabled:opacity-40"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={stockByProduct.get(item.productId) ?? 0}
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
                        disabled={
                          status !== 'ready' ||
                          draftQuantity >= (stockByProduct.get(item.productId) ?? 0)
                        }
                        className="h-5 w-5 rounded border border-line-strong text-xs text-ink disabled:opacity-40"
                      >
                        +
                      </button>
                      <span className="text-[0.65rem] text-muted">in bag</span>
                    </div>
                    {changed && (
                      <button type="button" onClick={() => confirmCartQuantity(item)} disabled={status !== 'ready'} className="mt-1 rounded-full bg-ink px-2 py-1 text-[0.62rem] font-medium text-paper disabled:opacity-50">
                        Confirm change
                      </button>
                    )}
                        </>
                      )
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      )}
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
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.65rem] font-semibold text-paper shadow-sm transition-colors ${
                  checkoutOpen ? 'bg-ink' : 'bg-accent hover:bg-ink'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full bg-paper ${
                    checkoutOpen ? '' : 'animate-pulse'
                  }`}
                />
                Checkout
              </button>
            )}
            {cartPlacement === 'preview' ? (
              <button
                type="button"
                onClick={() => setCartOpen((open) => !open)}
                aria-expanded={cartOpen}
                aria-controls="agent-cart"
                className="rounded-full border border-line-strong px-2.5 py-1 text-[0.65rem] text-muted transition-colors hover:border-ink hover:text-ink"
              >
                Cart {cartCount}
              </button>
            ) : (
              <span className="rounded-full border border-line-strong px-2 py-0.5 text-[0.65rem] text-muted">
                Cart {cartCount}
              </span>
            )}
          </div>
        </div>

        {activeOrder && (
          <div
            id="agent-checkout"
            aria-hidden={!checkoutOpen}
            className={`absolute right-2 top-[3.4rem] z-40 max-h-[calc(100%-4.5rem)] w-[19rem] max-w-[calc(100%-1rem)] origin-top-right overflow-y-auto rounded-xl shadow-[0_24px_60px_-24px_rgba(23,21,15,0.45)] transition-[opacity,transform] duration-200 ease-out ${
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
            className="flex gap-2"
          >
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
