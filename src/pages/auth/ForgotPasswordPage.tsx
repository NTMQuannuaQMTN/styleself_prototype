import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AuthShell } from '../../components/auth/AuthShell'
import {
  FormAlert,
  SubmitButton,
  TextField,
} from '../../components/auth/form'
import { useAuth } from '../../auth/useAuth'
import { authErrorMessage } from '../../auth/errors'

export default function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await sendPasswordReset(email.trim())
      setSent(true)
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle={
        sent
          ? undefined
          : 'Enter your email and we’ll send you a link to set a new password.'
      }
      footer={
        <Link to="/login" className="font-medium text-ink underline">
          Back to log in
        </Link>
      }
    >
      {sent ? (
        <FormAlert tone="success">
          If an account exists for <strong>{email.trim()}</strong>, a reset link
          is on its way. Check your inbox.
        </FormAlert>
      ) : (
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
          <SubmitButton loading={submitting}>Send reset link</SubmitButton>
        </form>
      )}
    </AuthShell>
  )
}
