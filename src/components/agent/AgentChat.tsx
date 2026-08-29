import { useEffect, useMemo, useRef, useState } from 'react'
import { sendAgentMessage } from '../../agent/client'
import {
  emptyContext,
  type AgentBranding,
  type AgentContext,
  type ChatTurn,
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
}: {
  agentId: string
  /** Only for the merchant's own preview of a not-yet-published agent. */
  authToken?: string
  className?: string
}) {
  const conversationId = useMemo(() => newConversationId(), [])
  const [branding, setBranding] = useState<AgentBranding | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])
  const [context, setContext] = useState<AgentContext>(emptyContext())
  const [status, setStatus] = useState<'init' | 'ready' | 'thinking'>('init')
  const [fatal, setFatal] = useState<string | null>(null)
  const [input, setInput] = useState('')
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
        orderPreview: res.orderPreview,
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

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-[18px] border border-line-strong bg-surface shadow-[0_30px_70px_-45px_rgba(23,21,15,0.3)] ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
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
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {status === 'init' ? (
          <TypingDots />
        ) : (
          turns.map((turn, i) => (
            <ChatMessage key={i} turn={turn} agentName={agentName} />
          ))
        )}
        {status === 'thinking' && <TypingDots />}
      </div>

      <div className="border-t border-line p-3">
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
  )
}
