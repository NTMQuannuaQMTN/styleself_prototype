import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { UserRole } from '../lib/database.types'
import { useAuth } from './useAuth'
import { roleHome } from './roles'

export function FullPageSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper">
      <span
        className="h-6 w-6 animate-spin rounded-full border-2 border-line-strong border-t-ink"
        aria-hidden
      />
      <p className="text-sm text-muted">{label}</p>
    </div>
  )
}

/** Gate a route behind a signed-in session. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, session } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageSpinner />
  if (!session) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  return <>{children}</>
}

/** Gate a route behind a signed-in session AND a specific role. */
export function RequireRole({
  role,
  children,
}: {
  role: UserRole
  children: ReactNode
}) {
  const { loading, session, profile, profileLoading, signOut } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageSpinner />
  if (!session) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  if (profileLoading || (!profile && profileLoading)) {
    return <FullPageSpinner label="Preparing your account…" />
  }
  if (!profile) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl text-ink">We couldn't load your account</h1>
        <p className="text-sm text-muted">
          Your profile isn't ready yet. Try reloading — if this keeps happening,
          sign out and back in.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void signOut()}
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }
  if (profile.role !== role) {
    return <Navigate to={roleHome(profile.role)} replace />
  }
  return <>{children}</>
}

/** For /login and /create-account: bounce already-authenticated users away. */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { loading, session } = useAuth()
  if (loading) return <FullPageSpinner />
  if (session) return <Navigate to="/app" replace />
  return <>{children}</>
}

/** Neutral post-login target: send the user to their role's home. */
export function RoleRedirect() {
  const { loading, session, profile, profileLoading } = useAuth()

  if (loading || profileLoading) return <FullPageSpinner label="Signing you in…" />
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <FullPageSpinner label="Preparing your account…" />
  return <Navigate to={roleHome(profile.role)} replace />
}
