import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { AgentChat } from '../../components/agent/AgentChat'

/**
 * Public, unauthenticated route — the deployed StyleSelf agent.
 *
 * The merchant embeds it as a full-viewport transparent overlay iframe. A
 * launcher button sits at the bottom-right; pressing it opens the chat panel
 * centered on the screen, with the host page showing through around both.
 */
export default function AgentPage() {
  const { agentId = 'demo' } = useParams()
  const [params] = useSearchParams()
  const embedKey = params.get('k') ?? undefined
  const [open, setOpen] = useState(false)

  // This route is an overlay — let the host page (or blank canvas) show through
  // everywhere except the chat panel and its launcher.
  useEffect(() => {
    const { body, documentElement: html } = document
    const prev = { body: body.style.background, html: html.style.background }
    body.style.background = 'transparent'
    html.style.background = 'transparent'
    return () => {
      body.style.background = prev.body
      html.style.background = prev.html
    }
  }, [])

  return (
    <div className="fixed inset-0 flex flex-col items-end justify-end gap-3 bg-transparent p-4 sm:p-5">
      <div
        className={` flex h-[min(620px,calc(100dvh-7rem))] w-[min(640px,calc(100vw-2rem))] flex-col overflow-hidden transition-all duration-300 ease-out ${
          open
            ? 'scale-100 opacity-100'
            : 'pointer-events-none translate-y-4 scale-95 opacity-0'
        }`}
      >
        <AgentChat
          agentId={agentId}
          embedKey={embedKey}
          onMinimize={() => setOpen(false)}
          className="min-h-0 flex-1"
        />
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex shrink-0 items-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-semibold text-paper shadow-[0_16px_40px_-12px_rgba(23,21,15,0.5)] transition-transform hover:-translate-y-0.5"
      >
        {open ? (
          <>
            <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden>
              <path
                d="M4 4l7 7M11 4l-7 7"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
            Close
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-success" />
            Chat with a stylist
          </>
        )}
      </button>
    </div>
  )
}
