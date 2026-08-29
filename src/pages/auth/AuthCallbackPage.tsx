import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { FullPageSpinner } from '../../auth/guards'
import { useAuth } from '../../auth/useAuth'

/**
 * Landing point for Google OAuth and email-confirmation redirects. The Supabase
 * client exchanges the code automatically (detectSessionInUrl); we just wait for
 * the session to appear, then hand off to <RoleRedirect> at /app.
 */
export default function AuthCallbackPage() {
  const { session, loading } = useAuth()
  const [timedOut, setTimedOut] = useState(false)

  // Surface provider errors passed back in the URL (?error=... or #error=...).
  const urlError = (() => {
    const q = new URLSearchParams(window.location.search)
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    return (
      q.get('error_description') ||
      q.get('error') ||
      h.get('error_description') ||
      h.get('error')
    )
  })()

  useEffect(() => {
    const id = window.setTimeout(() => setTimedOut(true), 10000)
    return () => window.clearTimeout(id)
  }, [])

  if (urlError) {
    return (
      <Navigate
        to={`/login?error=${encodeURIComponent(urlError)}`}
        replace
      />
    )
  }
  if (session) return <Navigate to="/app" replace />
  if (!loading && timedOut) {
    return (
      <Navigate
        to="/login?error=We%20couldn%27t%20complete%20sign-in.%20Please%20try%20again."
        replace
      />
    )
  }
  return <FullPageSpinner label="Completing sign-in…" />
}
