import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthShell } from '../../components/auth/AuthShell'
import {
  FormAlert,
  GoogleButton,
  OrDivider,
  PasswordField,
  SubmitButton,
  TextField,
} from '../../components/auth/form'
import { useAuth } from '../../auth/useAuth'
import { authErrorMessage, safeNextPath } from '../../auth/errors'

export default function LoginPage() {
  const { signInWithPassword, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNextPath(params.get('next')) ?? '/merchant'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(params.get('error'))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signInWithPassword(email.trim(), password)
      navigate(next, { replace: true })
    } catch (err) {
      setError(authErrorMessage(err))
      setSubmitting(false)
    }
  }

  async function onGoogle() {
    setError(null)
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(authErrorMessage(err))
      setGoogleLoading(false)
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to manage your store and your Fashion Commerce Agent."
      footer={
        <>
          New to StyleSelf?{' '}
          <Link to="/signup" className="font-medium text-ink underline">
            Create an account
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <GoogleButton onClick={onGoogle} disabled={googleLoading || submitting} />
        <OrDivider />

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {error ? <FormAlert>{error}</FormAlert> : null}

          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />

          <div>
            <PasswordField
              label="Password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            <div className="mt-2 text-right">
              <Link
                to="/forgot-password"
                className="text-xs text-muted transition-colors hover:text-ink"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <SubmitButton loading={submitting}>Log in</SubmitButton>
        </form>
      </div>
    </AuthShell>
  )
}
