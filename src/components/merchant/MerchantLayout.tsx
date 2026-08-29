import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { AppHeader } from '../app/AppHeader'
import { useStore } from '../../merchant/useStore'
import { storeLabel } from '../../merchant/api'
import { FullPageSpinner } from '../../auth/guards'

const NAV = [
  { to: '/merchant', label: 'Overview', end: true },
  { to: '/merchant/agent', label: 'Agent Studio' },
  { to: '/merchant/catalog', label: 'Catalog' },
  { to: '/merchant/locations', label: 'Locations' },
  { to: '/merchant/team', label: 'Team', badgeKey: 'team' as const },
  { to: '/merchant/deploy', label: 'Deploy' },
  { to: '/merchant/preview', label: 'Preview' },
  { to: '/merchant/settings', label: 'Settings' },
]

function StoreSwitcher() {
  const { memberships, activeStore, locations, setActiveStore } = useStore()
  const locationDetails = locations
    .map((location) => {
      const address = [location.city, location.address]
        .filter(Boolean)
        .join(' · ')
      return `${location.name}${address ? ` — ${address}` : ''}${location.is_primary ? ' (Primary)' : ''}`
    })
  if (memberships.length < 2) {
    return (
      <div className="px-3 py-2">
        <p className="font-display text-sm text-ink">{activeStore?.name}</p>
        {activeStore && storeLabel(activeStore) ? (
          <p className="text-xs text-muted">{storeLabel(activeStore)}</p>
        ) : null}
        {locationDetails.length > 0 && (
          <div className="mt-2 space-y-0.5 border-t border-line pt-2">
            {locationDetails.map((detail) => (
              <p key={detail} className="text-xs text-muted">
                {detail}
              </p>
            ))}
          </div>
        )}
      </div>
    )
  }
  return (
    <label className="block px-3 py-2">
      <span className="field-label !mb-1 !text-[0.7rem]">Store</span>
      <select
        className="field-input !py-1.5 !text-sm"
        value={activeStore?.id ?? ''}
        onChange={(e) => setActiveStore(e.target.value)}
      >
        {memberships.map((m) => {
          const detail = storeLabel(m.store)
          return (
            <option key={m.store.id} value={m.store.id}>
              {m.store.name}
              {detail ? ` · ${detail}` : ''}
            </option>
          )
        })}
      </select>
      {locationDetails.length > 0 && (
        <div className="mt-2 space-y-0.5 border-t border-line pt-2">
          {locationDetails.map((detail) => (
            <p key={detail} className="text-xs text-muted">
              {detail}
            </p>
          ))}
        </div>
      )}
    </label>
  )
}

export function MerchantLayout() {
  const { memberships, activeStore, loading, incomingRequestCount } = useStore()
  const location = useLocation()

  if (loading) return <FullPageSpinner label="Loading your workspace…" />
  if (memberships.length === 0) {
    return (
      <Navigate to="/merchant/onboarding" replace state={{ from: location }} />
    )
  }
  if (!activeStore) return <FullPageSpinner label="Loading your store…" />

  const badgeFor = (key?: 'team') =>
    key === 'team' && incomingRequestCount > 0 ? incomingRequestCount : null

  return (
    <div className="min-h-screen bg-paper">
      <AppHeader />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:px-8 lg:flex-row lg:gap-10">
        <aside className="lg:w-56 lg:shrink-0">
          <div className="rounded-[14px] border border-line bg-surface lg:sticky lg:top-24">
            <StoreSwitcher />
            <nav className="flex gap-1 overflow-x-auto border-t border-line p-2 lg:flex-col lg:overflow-visible">
              {NAV.map((item) => {
                const badge = badgeFor(item.badgeKey)
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex shrink-0 items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? 'bg-ink text-paper'
                          : 'text-ink-soft hover:bg-black/[0.04]'
                      }`
                    }
                  >
                    {item.label}
                    {badge ? (
                      <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[0.65rem] font-semibold text-paper">
                        {badge}
                      </span>
                    ) : null}
                  </NavLink>
                )
              })}
            </nav>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
