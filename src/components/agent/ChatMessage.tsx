import type {
  AgentCart,
  AgentComparison,
  AgentOrderPreview,
  AgentProductCard,
} from '../../agent/types'
import { CartCard } from './CartCard'
import { ComparisonCard } from './ComparisonCard'
import { OrderPreview } from './OrderPreview'
import { ProductCards } from './ProductCards'

export type Turn = {
  role: 'user' | 'assistant'
  text: string
  products?: AgentProductCard[]
  comparison?: AgentComparison
  cart?: AgentCart
  orderPreview?: AgentOrderPreview
  orderDraftToken?: string
}

export function ChatMessage({
  turn,
  agentName,
  onAdd,
  agentId,
  conversationId,
  authToken,
}: {
  turn: Turn
  agentName: string
  onAdd?: (product: AgentProductCard) => void
  agentId: string
  conversationId: string
  authToken?: string
}) {
  if (turn.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-3.5 py-2 text-sm leading-relaxed text-paper">
          {turn.text}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="eyebrow text-[0.55rem] tracking-[0.18em]">{agentName}</span>
      {turn.text && (
        <p className="max-w-[92%] rounded-2xl rounded-tl-md border border-line bg-paper px-3.5 py-2 text-sm leading-relaxed text-ink-soft">
          {turn.text}
        </p>
      )}
      {turn.products && turn.products.length > 0 && (
        <ProductCards products={turn.products} onAdd={onAdd} />
      )}
      {turn.comparison && <ComparisonCard comparison={turn.comparison} />}
      {turn.cart && !turn.orderPreview && <CartCard cart={turn.cart} />}
      {turn.orderPreview && (
        <OrderPreview
          agentId={agentId}
          conversationId={conversationId}
          orderDraftToken={turn.orderDraftToken}
          preview={turn.orderPreview}
          authToken={authToken}
        />
      )}
    </div>
  )
}

export function TypingDots() {
  return (
    <div className="flex items-center gap-1 pl-1" aria-label="Agent is typing">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-line-strong" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-line-strong [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-line-strong [animation-delay:300ms]" />
    </div>
  )
}
