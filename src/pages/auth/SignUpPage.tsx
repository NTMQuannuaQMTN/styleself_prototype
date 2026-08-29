import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import { authErrorMessage } from '../../auth/errors'

export default function SignUpPage() {
  const { signUpWithPassword, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Choose a password with at least 8 characters.')
      return
    }

    setSubmitting(true)
    try {
      const { needsEmailConfirmation, alreadyRegistered } =
        await signUpWithPassword({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
        })

      if (alreadyRegistered) {
        setError('An account with this email already exists. Try logging in.')
        setSubmitting(false)
        return
      }
      if (needsEmailConfirmation) {
        setSentTo(email.trim())
        setSubmitting(false)
        return
      }
      navigate('/merchant', { replace: true })
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

  if (sentTo) {
    return (
      <AuthShell
        title="Confirm your email"
        subtitle={
          <>
            We sent a confirmation link to <strong>{sentTo}</strong>. Click it to
            finish setting up your account.
          </>
        }
        footer={
          <Link to="/login" className="font-medium text-ink underline">
            Back to log in
          </Link>
        }
      >
        <FormAlert tone="success">
          Didn’t get it? Check spam, or wait a minute and sign up again.
        </FormAlert>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Deploy your agent"
      subtitle="Create your StyleSelf account to configure and deploy your Fashion Commerce Agent."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-ink underline">
            Log in
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <GoogleButton
          onClick={onGoogle}
          disabled={googleLoading || submitting}
          label="Sign up with Google"
        />
        <OrDivider />

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {error ? <FormAlert>{error}</FormAlert> : null}

          <TextField
            label="Full name"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Alex Tan"
          />
          <TextField
            label="Work email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@yourstore.com"
          />
          <PasswordField
            label="Password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            hint="Use at least 8 characters."
          />

          <SubmitButton loading={submitting}>Create account</SubmitButton>

          <p className="text-xs leading-relaxed text-muted">
            By continuing you agree to StyleSelf’s Terms and acknowledge our
            Privacy Policy.
          </p>
        </form>
      </div>
    </AuthShell>
  )
}
