import { useMemo, useState } from 'react'
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
import { authErrorMessage } from '../../auth/errors'
import { isRole, ROLE_COPY, ROLES } from '../../auth/roles'
import type { UserRole } from '../../lib/database.types'

function RoleChooser({ onPick }: { onPick: (role: UserRole) => void }) {
  return (
    <AuthShell
      title="How will you use StyleSelf?"
      subtitle="Pick the experience you want. You can’t change this later without a new account."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-ink underline">
            Log in
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {ROLES.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => onPick(role)}
            className="group flex items-center justify-between rounded-xl border border-line-strong bg-surface p-4 text-left transition-colors hover:border-ink"
          >
            <span>
              <span className="block text-[0.95rem] font-medium text-ink">
                {ROLE_COPY[role].chooserLabel}
              </span>
              <span className="mt-0.5 block text-sm text-muted">
                {ROLE_COPY[role].blurb}
              </span>
            </span>
            <span
              aria-hidden
              className="ml-3 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
            >
              →
            </span>
          </button>
        ))}
      </div>
    </AuthShell>
  )
}

export default function SignUpPage() {
  const { signUpWithPassword, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const roleParam = params.get('role')
  const role = useMemo<UserRole | null>(
    () => (isRole(roleParam) ? roleParam : null),
    [roleParam],
  )

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  if (!role) {
    return (
      <RoleChooser
        onPick={(picked) => {
          setParams({ role: picked }, { replace: true })
        }}
      />
    )
  }

  const copy = ROLE_COPY[role]

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!role) return
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
          role,
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
      navigate('/app', { replace: true })
    } catch (err) {
      setError(authErrorMessage(err))
      setSubmitting(false)
    }
  }

  async function onGoogle() {
    if (!role) return
    setError(null)
    setGoogleLoading(true)
    try {
      await signInWithGoogle(role)
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
            finish setting up your {copy.label.toLowerCase()} account.
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
      title={copy.cta}
      subtitle={
        <>
          Creating a <strong>{copy.label.toLowerCase()}</strong> account.{' '}
          <button
            type="button"
            className="text-ink underline"
            onClick={() => setParams({}, { replace: true })}
          >
            Change
          </button>
        </>
      }
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
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
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
