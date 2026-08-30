import type {
  AgentCart,
  AgentComparison,
  AgentOrderPreview,
  AgentProductCard,
} from '../../agent/types'
import { CartCard } from './CartCard'
import { ComparisonCard } from './ComparisonCard'
import { OrderPreview } from './OrderPreview'
import { ProductCards, type CardSelection } from './ProductCards'

/**
 * Render the agent's reply as blocks: blank-line- or newline-separated
 * paragraphs, with consecutive "- " lines grouped into a bullet list.
 */
function RichText({ text }: { text: string }) {
  const blocks: { type: 'p' | 'ul'; items: string[] }[] = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const last = blocks[blocks.length - 1]
    if (line.startsWith('- ')) {
      const item = line.slice(2).trim()
      if (last?.type === 'ul') last.items.push(item)
      else blocks.push({ type: 'ul', items: [item] })
    } else {
      blocks.push({ type: 'p', items: [line] })
    }
  }

  return (
    <>
      {blocks.map((b, i) =>
        b.type === 'ul' ? (
          <ul
            key={i}
            className="list-disc space-y-0.5 pl-5 marker:text-muted"
          >
            {b.items.map((it, j) => (
              <li key={j}>{it}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{b.items[0]}</p>
        ),
      )}
    </>
  )
}

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
  agentId,
  conversationId,
  authToken,
  busy,
  cardSelection,
  cardConfirmed,
  onCardSelect,
  onCardConfirm,
  onAskDetails,
  onOpenDetail,
}: {
  turn: Turn
  agentName: string
  agentId: string
  conversationId: string
  authToken?: string
  busy?: boolean
  cardSelection?: Record<string, CardSelection>
  cardConfirmed?: boolean
  onCardSelect?: (productId: string, next: CardSelection | null) => void
  onCardConfirm?: () => void
  onAskDetails?: (productName: string) => void
  onOpenDetail?: (product: AgentProductCard) => void
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
        <div className="max-w-[92%] space-y-2 rounded-2xl rounded-tl-md border border-line bg-paper px-3.5 py-2 text-sm leading-relaxed text-ink-soft">
          <RichText text={turn.text} />
        </div>
      )}
      {turn.products && turn.products.length > 0 && (
        <ProductCards
          products={turn.products}
          selection={cardSelection ?? {}}
          confirmed={cardConfirmed ?? false}
          busy={busy ?? false}
          onSelect={(id, next) => onCardSelect?.(id, next)}
          onConfirm={() => onCardConfirm?.()}
          onAskDetails={(name) => onAskDetails?.(name)}
          onOpenDetail={(p) => onOpenDetail?.(p)}
        />
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
          readOnly
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
