import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { useStore } from '../../merchant/useStore'
import { useAsync } from '../../merchant/useAsync'
import { getDashboardCounts } from '../../merchant/api'
import {
  Card,
  LoadingRow,
  PageHeader,
  StatCard,
} from '../../components/merchant/ui'

export default function DashboardPage() {
  const { profile } = useAuth()
  const { activeStore, activeRole, agent, incomingRequestCount } = useStore()
  const firstName = profile?.full_name?.split(' ')[0]

  const counts = useAsync(
    () => getDashboardCounts(activeStore!.id),
    [activeStore?.id],
  )

  if (!activeStore) return null

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`${activeStore.name} · ${activeRole}`}
        title={firstName ? `Welcome back, ${firstName}` : 'Overview'}
        description="Everything your Fashion Commerce Agent uses to help customers shop."
        action={
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
              activeStore.agent_live
                ? 'border-success/30 bg-success/10 text-success'
                : 'border-line-strong text-muted'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                activeStore.agent_live ? 'bg-success' : 'bg-line-strong'
              }`}
            />
            {activeStore.agent_live ? 'Agent live' : 'Not deployed'}
          </span>
        }
      />

      {incomingRequestCount > 0 && (
        <Card className="flex items-center justify-between gap-4 border-accent/30 bg-accent-soft/50">
          <p className="text-sm text-ink">
            {incomingRequestCount} teammate
            {incomingRequestCount === 1 ? '' : 's'} asked to join this store.
          </p>
          <Link to="/merchant/team" className="btn btn-primary !py-2 text-sm">
            Review
          </Link>
        </Card>
      )}

      {counts.loading ? (
        <LoadingRow label="Loading store metrics…" />
      ) : counts.error ? (
        <p className="text-sm text-[#8f3a24]">{counts.error}</p>
      ) : counts.data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Products"
            value={counts.data.products}
            hint={`${counts.data.activeProducts} active`}
          />
          <StatCard label="Locations" value={counts.data.locations} />
          <StatCard label="Units in stock" value={counts.data.totalUnits} />
          <StatCard label="Team" value={counts.data.members} />
          <StatCard
            label="Pending requests"
            value={counts.data.pendingRequests}
          />
          <StatCard
            label="Currency"
            value={agent?.currency ?? 'USD'}
            hint="Set in Agent Studio"
          />
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <QuickLink
          to="/merchant/catalog"
          title="Add products"
          body="Import your catalog so the agent has something to sell."
        />
        <QuickLink
          to="/merchant/agent"
          title="Configure the agent"
          body="Set its voice, greeting, and commerce rules."
        />
        <QuickLink
          to="/merchant/locations"
          title="Manage locations"
          body="Single store or many — inventory is tracked per location."
        />
        <QuickLink
          to="/merchant/deploy"
          title="Deploy"
          body="Copy the embed snippet and take the agent live."
        />
      </div>
    </div>
  )
}

function QuickLink({
  to,
  title,
  body,
}: {
  to: string
  title: string
  body: string
}) {
  return (
    <Link
      to={to}
      className="group rounded-[14px] border border-line bg-surface p-5 transition-colors hover:border-ink"
    >
      <p className="font-display text-base text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted">{body}</p>
      <span className="mt-3 inline-block text-sm text-accent">Open →</span>
    </Link>
  )
}
