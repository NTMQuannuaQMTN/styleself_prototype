import { useEffect, useMemo, useRef, useState } from 'react'
import { sendAgentMessage } from '../../agent/client'
import {
  emptyContext,
  type AgentBranding,
  type AgentContext,
  type ChatTurn,
  type AgentProductCard,
} from '../../agent/types'
import { ChatMessage, TypingDots, type Turn } from './ChatMessage'

const HISTORY_LIMIT = 8

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
}: {
  agentId: string
  /** Only for the merchant's own preview of a not-yet-published agent. */
  authToken?: string
  className?: string
  cartPlacement?: 'left' | 'preview'
}) {
  const conversationId = useMemo(() => newConversationId(), [])
  const [branding, setBranding] = useState<AgentBranding | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])
  const [context, setContext] = useState<AgentContext>(emptyContext())
  const [status, setStatus] = useState<'init' | 'ready' | 'thinking'>('init')
  const [fatal, setFatal] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [cart, setCart] = useState<{ product: AgentProductCard; quantity: number }[]>([])
  // Keep the cart visible from the first paint; it starts empty and updates in place.
  const [cartOpen, setCartOpen] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

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

  const agentName = branding?.agentName ?? 'StyleSelf'

  function addToCart(product: AgentProductCard) {
    setCart((items) => {
      const existing = items.find((item) => item.product.id === product.id)
      if (existing) {
        return items.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      }
      return [...items, { product, quantity: 1 }]
    })
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

  return (
    <div className={`relative ${className}`}>
      {cartOpen && <aside
        id="agent-cart"
        aria-label="Current shopping cart"
        className={`mb-3 w-full rounded-[18px] border border-line-strong bg-surface p-3 shadow-[0_20px_50px_-30px_rgba(23,21,15,0.35)] md:mb-0 md:w-44 ${
          cartPlacement === 'preview'
            ? 'md:absolute md:right-0 md:top-12 md:z-30'
            : 'md:absolute md:right-full md:top-12 md:mr-4'
        }`}
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
            {cart.map(({ product, quantity }) => (
              <div key={product.id} className="flex gap-2">
                <div className="h-12 w-10 shrink-0 overflow-hidden rounded border border-line bg-accent-soft/50">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 text-xs">
                  <p className="line-clamp-2 text-ink">{product.name}</p>
                  <p className="mt-0.5 font-medium text-muted">× {quantity}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>}
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
        {cartPlacement === 'preview' ? (
          <button
            type="button"
            onClick={() => setCartOpen((open) => !open)}
            aria-expanded={cartOpen}
            aria-controls="agent-cart"
            className="ml-auto rounded-full border border-line-strong px-2.5 py-1 text-[0.65rem] text-muted transition-colors hover:border-ink hover:text-ink"
          >
            Cart {cartCount}
          </button>
        ) : (
          <span className="rounded-full border border-line-strong px-2 py-0.5 text-[0.65rem] text-muted">
            Cart {cartCount}
          </span>
        )}
      </div>

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
              onAdd={addToCart}
              agentId={agentId}
              conversationId={conversationId}
              authToken={authToken}
              onAdd={addToCart}
              onPaid={(order) => {
                setContext((c) => ({ ...c, cart: [], selectedProductIds: [] }))
                setTurns((t) => [
                  ...t,
                  {
                    role: 'assistant',
                    text: `Payment received — order ${order.orderId} is confirmed. Anything else I can help you find?`,
                  },
                ])
              }}
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
    </div>
  )
}
