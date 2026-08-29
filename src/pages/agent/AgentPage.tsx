import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { AgentChat } from '../../components/agent/AgentChat'

/**
 * Public, unauthenticated route — the deployed StyleSelf agent. Merchants embed
 * it in their own site:
 *
 *   <iframe src="https://<host>/agent/<agentId>" width="100%" height="650" />
 *
 * All AI + catalog logic lives behind /api/agent/chat; nothing sensitive reaches
 * this page. `/agent/demo` runs on a built-in sample catalog.
 */
export default function AgentPage() {
  const { agentId = 'demo' } = useParams()
  const [size, setSize] = useState<'small' | 'large'>('small')

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-paper">
      <div
        className={`mx-auto flex w-full min-h-0 flex-1 flex-col p-3 transition-[max-width] duration-300 sm:p-4 ${
          size === 'large' ? 'max-w-5xl' : 'max-w-lg'
        }`}
      >
        <div className="mb-2 flex shrink-0 justify-end">
          <div className="inline-flex rounded-full border border-line-strong bg-surface p-0.5 text-[0.65rem]" aria-label="Chat window size">
            {(['small', 'large'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={size === option}
                onClick={() => setSize(option)}
                className={`rounded-full px-2.5 py-1 capitalize transition-colors ${size === option ? 'bg-ink text-paper' : 'text-muted hover:text-ink'}`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <AgentChat agentId={agentId} className="min-h-0 flex-1" />
        <p className="mt-2 shrink-0 text-center text-[0.68rem] text-muted">
          Shopping assistant by{' '}
          <span className="font-display italic text-ink">StyleSelf</span>
        </p>
      </div>
    </div>
  )
}
