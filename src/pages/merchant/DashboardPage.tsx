import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { useStore } from '../../merchant/useStore'
import { useAsync } from '../../merchant/useAsync'
import { getDashboardCounts, listOrders } from '../../merchant/api'
import { formatMoney } from '../../merchant/money'
import { LoadingRow, PageHeader } from '../../components/merchant/ui'

export default function DashboardPage() {
  const { profile } = useAuth()
  const { activeStore, activeRole, agent, isManager, incomingRequestCount } =
    useStore()
  const firstName = profile?.full_name?.split(' ')[0]

  const counts = useAsync(
    () => getDashboardCounts(activeStore!.id),
    [activeStore?.id],
  )
  const orders = useAsync(
    () => listOrders(activeStore!.id).catch(() => []),
    [activeStore?.id],
  )

  if (!activeStore) return null

  const live = activeStore.agent_live
  const currency = agent?.currency ?? 'USD'
  const recent = orders.data ?? []
  const gross = recent.reduce((s, o) => s + o.total_cents, 0)

  const notReady =
    !counts.loading &&
    counts.data &&
    ((counts.data.activeProducts ?? 0) === 0 ||
      (counts.data.locations ?? 0) === 0)

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`${activeStore.name} · ${activeRole}`}
        title={firstName ? `Welcome back, ${firstName}` : 'Overview'}
        description="Your Fashion Commerce Agent, and everything it draws on to help shoppers."
      />

      {incomingRequestCount > 0 && (
        <Link
          to="/merchant/team"
          className="group flex items-center justify-between gap-4 rounded-[14px] border border-accent/40 bg-accent-soft/60 px-5 py-4 transition-colors hover:border-accent"
        >
          <p className="text-sm text-ink">
            <span className="font-medium">{incomingRequestCount}</span> teammate
            {incomingRequestCount === 1 ? '' : 's'} asked to join this store.
          </p>
          <span className="shrink-0 text-sm font-medium text-accent">
            Review →
          </span>
        </Link>
      )}

      {/* Agent status hero ---------------------------------------------------- */}
      <div className="overflow-hidden rounded-[18px] border border-line bg-surface">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:justify-between sm:p-7">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[0.68rem] font-medium ${
                  live
                    ? 'bg-success/12 text-success'
                    : 'bg-black/[0.05] text-muted'
                }`}
              >
                <span
                  className={`relative flex h-1.5 w-1.5 ${live ? '' : 'opacity-60'}`}
                >
                  {live && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                      live ? 'bg-success' : 'bg-line-strong'
                    }`}
                  />
                </span>
                {live ? 'Agent live' : 'Not deployed'}
              </span>
            </div>
            <h2 className="mt-3 font-display text-xl text-ink">
              {agent?.display_name ?? 'Your agent'}
            </h2>
            <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">
              {agent?.greeting
                ? `“${agent.greeting}”`
                : 'A pre-built fashion shopping assistant. Configure its voice in Agent Studio.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
              <Meta>{agent?.category_focus?.trim() || 'Fashion'}</Meta>
              <Meta>{agent?.tone ? `${agent.tone} tone` : 'Warm tone'}</Meta>
              <Meta>Recommends up to {agent?.recommendation_limit ?? 3}</Meta>
              <Meta>
                {agent?.require_confirmation === false
                  ? 'Auto-checkout'
                  : 'Confirms every purchase'}
              </Meta>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <Link
              to="/merchant/preview"
              className="btn btn-primary !py-2.5 text-sm"
            >
              Talk to your agent
            </Link>
            {live ? (
              <a
                href={`/agent/${activeStore.slug}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary !py-2.5 text-sm"
              >
                Open live agent ↗
              </a>
            ) : (
              <Link
                to="/merchant/deploy"
                className="btn btn-secondary !py-2.5 text-sm"
              >
                {notReady ? 'Finish setup' : 'Deploy'}
              </Link>
            )}
          </div>
        </div>

        {/* metric strip */}
        {counts.loading ? (
          <div className="border-t border-line px-6">
            <LoadingRow label="Loading store metrics…" />
          </div>
        ) : counts.error ? (
          <p className="border-t border-line px-6 py-4 text-sm text-[#8f3a24]">
            {counts.error}
          </p>
        ) : counts.data ? (
          <dl className="grid grid-cols-2 divide-line border-t border-line sm:grid-cols-4 sm:divide-x">
            <Metric
              label="Active products"
              value={counts.data.activeProducts}
              sub={
                counts.data.products > counts.data.activeProducts
                  ? `${counts.data.products} total`
                  : 'in the catalog'
              }
              to="/merchant/catalog"
            />
            <Metric
              label="Units in stock"
              value={counts.data.totalUnits.toLocaleString()}
              sub={`across ${counts.data.locations} location${
                counts.data.locations === 1 ? '' : 's'
              }`}
              to="/merchant/locations"
            />
            <Metric
              label="Agent orders"
              value={orders.loading ? '·' : recent.length}
              sub={
                recent.length
                  ? `${formatMoney(gross, currency)} gross`
                  : 'none yet'
              }
              to="/merchant/orders"
            />
            <Metric
              label="Team"
              value={counts.data.members}
              sub={
                counts.data.pendingRequests > 0
                  ? `${counts.data.pendingRequests} pending`
                  : 'members'
              }
              to="/merchant/team"
            />
          </dl>
        ) : null}
      </div>

      {/* Do next ------------------------------------------------------------- */}
      <section>
        <p className="eyebrow mb-3">Manage</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <NavCard
            to="/merchant/catalog"
            icon={<IconTag />}
            title="Catalog"
            body="Products, variants, and stock the agent sells from. Bulk-import with a CSV."
            flag={
              counts.data && (counts.data.activeProducts ?? 0) === 0
                ? 'Nothing to sell yet'
                : undefined
            }
          />
          <NavCard
            to="/merchant/agent"
            icon={<IconSpark />}
            title="Agent Studio"
            body="Its name, greeting, tone, currency, and the rules it follows on every purchase."
          />
          <NavCard
            to="/merchant/locations"
            icon={<IconPin />}
            title="Locations"
            body="One shop or many — inventory and pickup are tracked per location."
          />
          <NavCard
            to="/merchant/deploy"
            icon={<IconCode />}
            title="Deploy"
            body={
              live
                ? 'Live on your site. Grab the embed snippet or rotate the key.'
                : 'One <iframe> line to embed the agent. Publish when the checklist clears.'
            }
            flag={live ? undefined : 'Not live'}
          />
          {(isManager || incomingRequestCount > 0) && (
            <NavCard
              to="/merchant/team"
              icon={<IconUsers />}
              title="Team"
              body="Members, roles, and join requests from your other locations."
              flag={
                incomingRequestCount > 0
                  ? `${incomingRequestCount} to review`
                  : undefined
              }
            />
          )}
          <NavCard
            to="/merchant/orders"
            icon={<IconReceipt />}
            title="Orders"
            body="Every checkout completed inside the chat, settled to your payout account."
          />
        </div>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------

function Meta({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-line px-2.5 py-1">
      {children}
    </span>
  )
}

function Metric({
  label,
  value,
  sub,
  to,
}: {
  label: string
  value: ReactNode
  sub: string
  to: string
}) {
  return (
    <Link
      to={to}
      className="group px-6 py-5 transition-colors hover:bg-black/[0.02]"
    >
      <dt className="text-[0.7rem] uppercase tracking-[0.14em] text-muted">
        {label}
      </dt>
      <dd className="mt-1.5 font-display text-2xl text-ink">{value}</dd>
      <p className="mt-0.5 text-xs text-muted">{sub}</p>
    </Link>
  )
}

function NavCard({
  to,
  icon,
  title,
  body,
  flag,
}: {
  to: string
  icon: ReactNode
  title: string
  body: string
  flag?: string
}) {
  return (
    <Link
      to={to}
      className="group flex gap-4 rounded-[14px] border border-line bg-surface p-5 transition-all hover:border-ink hover:shadow-[0_18px_40px_-28px_rgba(23,21,15,0.4)]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] border border-line bg-paper text-ink-soft transition-colors group-hover:border-ink group-hover:text-ink">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-display text-base text-ink">{title}</p>
          {flag ? (
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[0.62rem] font-medium text-accent">
              {flag}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
        <span className="mt-2.5 inline-flex items-center gap-1 text-sm text-accent">
          Open
          <span className="transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </span>
      </div>
    </Link>
  )
}

// Icons — 20px, 1.6 stroke, currentColor -------------------------------------
const S = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function IconTag() {
  return (
    <svg {...S}>
      <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" />
      <circle cx="7" cy="7" r="1.4" />
    </svg>
  )
}
function IconSpark() {
  return (
    <svg {...S}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
    </svg>
  )
}
function IconPin() {
  return (
    <svg {...S}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}
function IconCode() {
  return (
    <svg {...S}>
      <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />
    </svg>
  )
}
function IconUsers() {
  return (
    <svg {...S}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
function IconReceipt() {
  return (
    <svg {...S}>
      <path d="M4 2v20l2-1.5L8 22l2-1.5L12 22l2-1.5L16 22l2-1.5L20 22V2l-2 1.5L16 2l-2 1.5L12 2l-2 1.5L8 2 6 3.5 4 2Z" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </svg>
  )
}
