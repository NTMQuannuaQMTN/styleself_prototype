import { Link, useParams } from 'react-router-dom'
import { AgentWidget } from '../../components/agent/AgentWidget'
import {
  DEMO_LOCATIONS,
  DEMO_PRODUCTS,
  DEMO_STORE,
} from '../../components/agent/demoData'

/**
 * Public, unauthenticated route representing a deployed StyleSelf agent. A
 * merchant embeds it in their own site:
 *
 *   <iframe src="https://styleself.app/agent/<agentId>" width="100%" height="640" />
 *
 * For the MVP every agentId renders the same demo store. Later this resolves the
 * real store + catalog + agent configuration from `agentId`.
 */
export default function AgentPage() {
  const { agentId } = useParams()
  const isDemo = !agentId || agentId === 'demo'

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="flex items-center justify-between border-b border-line px-4 py-2.5 text-xs text-muted">
        <span>
          {DEMO_STORE.name}
          {!isDemo && (
            <span className="ml-2 text-line-strong">· agent “{agentId}”</span>
          )}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="font-display italic text-ink">StyleSelf</span> agent
        </span>
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6">
        {isDemo && (
          <p className="mb-4 rounded-lg border border-line bg-surface px-3.5 py-2.5 text-xs text-muted">
            This is a live demo of the embedded agent, running on a sample
            catalog.{' '}
            <Link to="/" className="text-accent">
              About StyleSelf
            </Link>
          </p>
        )}

        <AgentWidget
          className="min-h-[30rem] flex-1"
          agentName={DEMO_STORE.agentName}
          greeting={DEMO_STORE.greeting}
          currency={DEMO_STORE.currency}
          storeName={DEMO_STORE.name}
          products={DEMO_PRODUCTS}
          locations={DEMO_LOCATIONS}
        />
      </div>
    </div>
  )
}
