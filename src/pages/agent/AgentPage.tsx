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

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col p-3 sm:p-4">
        <AgentChat agentId={agentId} className="min-h-[32rem] flex-1" />
        <p className="mt-2 text-center text-[0.68rem] text-muted">
          Shopping assistant by{' '}
          <span className="font-display italic text-ink">StyleSelf</span>
        </p>
      </div>
    </div>
  )
}
