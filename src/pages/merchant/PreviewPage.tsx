import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { useStore } from '../../merchant/useStore'
import { AgentChat } from '../../components/agent/AgentChat'
import { PageHeader } from '../../components/merchant/ui'

export default function PreviewPage() {
  const { session } = useAuth()
  const { activeStore } = useStore()

  if (!activeStore) return null

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Preview"
        title="Talk to your agent"
        description="The real Fashion Commerce Agent, running on this store's catalog and inventory. Uses OpenAI credits — a few messages is fine."
        action={
          activeStore.agent_live ? (
            <a
              href={`/agent/${activeStore.slug}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary !py-2 text-sm"
            >
              Open live agent →
            </a>
          ) : (
            <Link to="/merchant/deploy" className="btn btn-secondary !py-2 text-sm">
              Deploy →
            </Link>
          )
        }
      />

      <div className="mx-auto w-full max-w-2xl">
        <AgentChat
          key={activeStore.id}
          agentId={activeStore.slug}
          authToken={session?.access_token}
          embedKey={activeStore.embed_key}
          cartPlacement="preview"
          className="max-h-[34rem] min-h-[30rem] w-full"
        />
      </div>
    </div>
  )
}
