import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'

export const COMPLETE_PROFILE_PATH = '/merchant/complete-profile'

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

/**
 * Gate a route behind a signed-in session. Every StyleSelf user is a merchant.
 * If the account has no name yet (common after Google sign-in), send them to
 * the "complete your profile" step first.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, session, profile, profileLoading } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageSpinner />
  if (!session) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  if (profileLoading && !profile) {
    return <FullPageSpinner label="Loading your account…" />
  }

  const needsName = !profile?.full_name?.trim()
  if (needsName && location.pathname !== COMPLETE_PROFILE_PATH) {
    return <Navigate to={COMPLETE_PROFILE_PATH} replace />
  }
  // Once they have a name, keep them out of the completion step.
  if (!needsName && location.pathname === COMPLETE_PROFILE_PATH) {
    return <Navigate to="/merchant" replace />
  }

  return <>{children}</>
}

/** For /login and /signup: bounce already-authenticated users to the dashboard. */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { loading, session } = useAuth()
  if (loading) return <FullPageSpinner />
  if (session) return <Navigate to="/merchant" replace />
  return <>{children}</>
}
