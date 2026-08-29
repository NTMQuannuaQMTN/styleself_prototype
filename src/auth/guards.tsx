import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'

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

/** Gate a route behind a signed-in session. Every StyleSelf user is a merchant. */
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

/** For /login and /signup: bounce already-authenticated users to the dashboard. */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { loading, session } = useAuth()
  if (loading) return <FullPageSpinner />
  if (session) return <Navigate to="/merchant" replace />
  return <>{children}</>
}
