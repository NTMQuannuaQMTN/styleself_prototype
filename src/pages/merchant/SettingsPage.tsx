import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AppHeader } from '../../components/app/AppHeader'
import {
  Card,
  InlineError,
  PageHeader,
  TextField,
} from '../../components/merchant/ui'
import { useAuth } from '../../auth/useAuth'
import { authErrorMessage } from '../../auth/errors'

export default function SettingsPage() {
  const { user, profile, updateProfile, updateEmail, sendPasswordReset } =
    useAuth()

  return (
    <div className="min-h-screen bg-paper">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-8">
        <PageHeader
          eyebrow="Account"
          title="Settings"
          description={
            <Link to="/merchant" className="text-accent">
              ← Back to dashboard
            </Link>
          }
        />

        <div className="mt-8 space-y-6">
          <NameCard
            initial={profile?.full_name ?? ''}
            onSave={(full_name) => updateProfile({ full_name })}
          />
          <EmailCard
            current={profile?.email ?? user?.email ?? ''}
            onSave={updateEmail}
          />
          <PasswordCard
            email={profile?.email ?? user?.email ?? ''}
            onSend={sendPasswordReset}
          />
        </div>
      </main>
    </div>
  )
}

function NameCard({
  initial,
  onSave,
}: {
  initial: string
  onSave: (name: string) => Promise<void>
}) {
  const [name, setName] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dirty = name.trim() !== initial.trim()

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name cannot be empty.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      await onSave(name.trim())
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <p className="font-display text-lg text-ink">Your name</p>
          <p className="mt-1 text-sm text-muted">
            Shown to your team across the workspace.
          </p>
        </div>
        <TextField
          label="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Alex Tan"
        />
        {error ? <InlineError>{error}</InlineError> : null}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy || !dirty}
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
          {saved && <span className="text-sm text-success">Saved</span>}
        </div>
      </form>
    </Card>
  )
}

function EmailCard({
  current,
  onSave,
}: {
  current: string
  onSave: (email: string) => Promise<void>
}) {
  const [email, setEmail] = useState(current)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dirty = email.trim().toLowerCase() !== current.trim().toLowerCase()

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await onSave(email.trim())
      setSent(true)
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <p className="font-display text-lg text-ink">Email</p>
          <p className="mt-1 text-sm text-muted">
            Used to sign in. Changing it needs confirmation from both addresses.
          </p>
        </div>
        <TextField
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {error ? <InlineError>{error}</InlineError> : null}
        {sent ? (
          <p className="text-sm text-success">
            Check your inbox to confirm the change.
          </p>
        ) : (
          <button
            type="submit"
            className="btn btn-secondary"
            disabled={busy || !dirty}
          >
            {busy ? 'Sending…' : 'Update email'}
          </button>
        )}
      </form>
    </Card>
  )
}

function PasswordCard({
  email,
  onSend,
}: {
  email: string
  onSend: (email: string) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    if (!email) return
    setError(null)
    setBusy(true)
    try {
      await onSend(email)
      setSent(true)
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <p className="font-display text-lg text-ink">Password</p>
      <p className="mt-1 text-sm text-muted">
        We'll email you a secure link to set a new password.
      </p>
      {error ? (
        <div className="mt-3">
          <InlineError>{error}</InlineError>
        </div>
      ) : null}
      <div className="mt-4">
        {sent ? (
          <p className="text-sm text-success">
            Reset link sent to {email}.
          </p>
        ) : (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={send}
            disabled={busy || !email}
          >
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
        )}
      </div>
    </Card>
  )
}
