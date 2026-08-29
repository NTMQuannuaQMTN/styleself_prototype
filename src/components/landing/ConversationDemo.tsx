import { useEffect, useRef, useState } from 'react'
import { useReveal } from '../../hooks/useReveal'
import { AgentBubble, ChatShell, ProductCard, UserBubble } from './chat'
import { DEMO_PRODUCTS } from './products'

const PICK = DEMO_PRODUCTS[0]

// Number of messages to stagger in once the demo scrolls into view.
const STEPS = 6

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function ConversationDemo() {
  const { ref, visible } = useReveal<HTMLDivElement>()
  const [step, setStep] = useState(() => (prefersReducedMotion() ? STEPS : 0))
  const started = useRef(false)

  useEffect(() => {
    if (!visible || started.current || prefersReducedMotion()) return
    started.current = true
    let current = 0
    const id = window.setInterval(() => {
      current += 1
      setStep(current)
      if (current >= STEPS) window.clearInterval(id)
    }, 640)
    return () => window.clearInterval(id)
  }, [visible])

  const show = (n: number) => step >= n

  return (
    <div ref={ref}>
      <ChatShell>
        {show(1) && (
          <UserBubble className="chat-in">
            I need something smart casual for a dinner this weekend. Under $150.
          </UserBubble>
        )}

        {show(2) && (
          <AgentBubble className="chat-in">
            I found 4 options that match your budget and style.
          </AgentBubble>
        )}

        {show(3) && (
          <div className="chat-in grid grid-cols-3 gap-2">
            {DEMO_PRODUCTS.map((p) => (
              <ProductCard
                key={p.name}
                name={p.name}
                price={p.price}
                image={p.image}
                alt={p.alt}
                highlight={p.name === PICK.name}
              />
            ))}
          </div>
        )}

        {show(4) && (
          <AgentBubble className="chat-in">
            <span className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-accent">
              My recommendation
            </span>
            The <strong className="font-medium text-ink">Linen Blazer</strong>. It
            matches your relaxed-fit preference and works well for a smart-casual
            dinner.
          </AgentBubble>
        )}

        {show(5) && (
          <UserBubble className="chat-in">
            What's the difference between the first two?
          </UserBubble>
        )}

        {show(6) && (
          <AgentBubble className="chat-in">
            The blazer is more formal and structured. The overshirt is lighter
            and more casual. Based on your preferences, I'd choose the blazer.
          </AgentBubble>
        )}

        {step > 0 && step < STEPS && (
          <div className="flex gap-1 pl-1" aria-hidden>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-line-strong" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-line-strong [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-line-strong [animation-delay:300ms]" />
          </div>
        )}
      </ChatShell>
    </div>
  )
}
