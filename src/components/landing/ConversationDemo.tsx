import { useEffect, useRef, useState } from 'react'
import { useReveal } from '../../hooks/useReveal'
import { AgentBubble, ChatShell, ProductCard, UserBubble } from './chat'

const PICKS = [
  { name: 'Linen Blazer', price: '$89', tone: '#d8c7ad' },
  { name: 'Relaxed Overshirt', price: '$72', tone: '#c3ccc0' },
  { name: 'Tailored Jacket', price: '$129', tone: '#b9b3ac' },
]

// Number of animation steps to stagger in once the demo scrolls into view.
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
    }, 620)
    return () => window.clearInterval(id)
  }, [visible])

  const show = (n: number) => step >= n

  return (
    <div ref={ref}>
      <ChatShell>
        {show(1) && (
          <UserBubble className="chat-in">
            I need something for a dinner this weekend. Under $150.
          </UserBubble>
        )}

        {show(2) && (
          <AgentBubble className="chat-in">
            I found a few options that match your style and budget. Here are my
            top picks:
          </AgentBubble>
        )}

        {show(3) && (
          <div className="chat-in grid grid-cols-3 gap-2">
            {PICKS.map((p) => (
              <ProductCard key={p.name} {...p} />
            ))}
          </div>
        )}

        {show(4) && (
          <AgentBubble className="chat-in">
            <span className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-accent">
              My pick for you
            </span>
            <strong className="font-display text-base font-medium text-ink">
              Linen Blazer
            </strong>
            <span className="mt-1 block">
              It matches your preferred relaxed fit and works well for a
              smart-casual dinner.
            </span>
          </AgentBubble>
        )}

        {show(5) && (
          <div className="chat-in flex items-center gap-3 rounded-xl border border-line bg-paper px-3 py-2.5">
            <div
              className="h-11 w-9 shrink-0 rounded-md"
              style={{
                background:
                  'linear-gradient(150deg, #d8c7ad 0%, rgba(255,255,255,0.4) 120%)',
              }}
            />
            <div className="min-w-0">
              <p className="text-xs font-medium text-ink">Linen Blazer · $89</p>
              <p className="truncate text-[0.7rem] text-muted">
                Relaxed fit · Size M
              </p>
            </div>
            <button
              type="button"
              className="ml-auto rounded-full bg-ink px-3.5 py-1.5 text-xs font-medium text-paper"
            >
              Choose this
            </button>
          </div>
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
