import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthShell } from '../../components/auth/AuthShell'
import {
  FormAlert,
  PasswordField,
  SubmitButton,
} from '../../components/auth/form'
import { useAuth } from '../../auth/useAuth'
import { authErrorMessage } from '../../auth/errors'

export default function ResetPasswordPage() {
  const { session, loading, updatePassword } = useAuth()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Give detectSessionInUrl a moment to exchange the recovery code.
  const [grace, setGrace] = useState(true)
  useEffect(() => {
    const id = window.setTimeout(() => setGrace(false), 1500)
    return () => window.clearTimeout(id)
  }, [])

  const linkInvalid = !loading && !grace && !session

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Choose a password with at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Those passwords don’t match.')
      return
    }
    setSubmitting(true)
    try {
      await updatePassword(password)
      setDone(true)
      window.setTimeout(() => navigate('/merchant', { replace: true }), 1200)
    } catch (err) {
      setError(authErrorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle={
        done
          ? undefined
          : 'Enter a new password for your account. You’ll stay signed in.'
      }
      footer={
        <Link to="/login" className="font-medium text-ink underline">
          Back to log in
        </Link>
      }
    >
      {done ? (
        <FormAlert tone="success">
          Password updated. Taking you to your dashboard…
        </FormAlert>
      ) : linkInvalid ? (
        <FormAlert>
          This reset link is invalid or has expired. Request a{' '}
          <Link to="/forgot-password" className="underline">
            new one
          </Link>
          .
        </FormAlert>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {error ? <FormAlert>{error}</FormAlert> : null}
          <PasswordField
            label="New password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
          <PasswordField
            label="Confirm new password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter your password"
          />
          <SubmitButton loading={submitting}>Update password</SubmitButton>
        </form>
      )}
    </AuthShell>
  )
}
