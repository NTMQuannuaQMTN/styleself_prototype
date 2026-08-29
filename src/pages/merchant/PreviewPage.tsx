import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { useStore } from '../../merchant/useStore'
import { AgentChat } from '../../components/agent/AgentChat'
import { PageHeader } from '../../components/merchant/ui'

export default function PreviewPage() {
  const { session } = useAuth()
  const { activeStore, agent } = useStore()

  if (!activeStore) return null

  const live = activeStore.agent_live

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Preview"
        title="Talk to your agent"
        description="The real Fashion Commerce Agent, running live on this store's catalog and inventory — exactly what a shopper on your site would see."
        action={
          live ? (
            <a
              href={`/agent/${activeStore.slug}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary !py-2 text-sm"
            >
              Open live agent ↗
            </a>
          ) : (
            <Link to="/merchant/deploy" className="btn btn-secondary !py-2 text-sm">
              Deploy →
            </Link>
          )
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_18rem] lg:items-start">
        {/* Chat -------------------------------------------------------------- */}
        <div className="mx-auto w-full max-w-2xl lg:mx-0">
          <AgentChat
            key={activeStore.id}
            agentId={activeStore.slug}
            authToken={session?.access_token}
            cartPlacement="preview"
            className="max-h-[36rem] min-h-[32rem] w-full"
          />
        </div>

        {/* Side rail ------------------------------------------------------- */}
        <aside className="space-y-4">
          <div className="rounded-[14px] border border-line bg-surface p-5">
            <p className="eyebrow text-[0.6rem]">This preview</p>
            <dl className="mt-3 space-y-2.5 text-sm">
              <Row label="Agent">{agent?.display_name ?? 'StyleSelf'}</Row>
              <Row label="Catalog">
                {live ? 'Live store' : 'Draft — includes unpublished'}
              </Row>
              <Row label="Currency">{agent?.currency ?? 'USD'}</Row>
              <Row label="Confirmation">
                {agent?.require_confirmation === false
                  ? 'Auto-checkout'
                  : 'Every purchase'}
              </Row>
            </dl>
          </div>

          <div className="rounded-[14px] border border-line bg-surface p-5">
            <p className="eyebrow text-[0.6rem]">Try the full flow</p>
            <ol className="mt-3 space-y-2 text-sm text-muted">
              <Step n={1}>Ask for something — “smart casual under $150”</Step>
              <Step n={2}>Pick a size and colour, add it to the bag</Step>
              <Step n={3}>Say “check out” to open the order preview</Step>
              <Step n={4}>Authorise with any test card, then pay</Step>
            </ol>
            <p className="mt-3 border-t border-line pt-3 text-xs text-muted">
              Card <span className="font-mono text-ink-soft">4242 4242 4242 4242</span>,
              any future expiry and CVC. No real charge — payment is a simulated Visa
              flow.
            </p>
          </div>

          <div className="rounded-[14px] border border-line bg-accent-soft/40 p-5">
            <p className="text-sm text-ink-soft">
              This uses live OpenAI credits. A handful of messages per session is
              plenty to see how it behaves.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{children}</dd>
    </div>
  )
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-ink text-[0.6rem] font-semibold text-paper">
        {n}
      </span>
      <span>{children}</span>
    </li>
  )
}
