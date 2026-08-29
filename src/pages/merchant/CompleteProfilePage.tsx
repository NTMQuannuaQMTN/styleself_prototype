import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '../../components/app/AppHeader'
import { InlineError, TextField } from '../../components/merchant/ui'
import { useAuth } from '../../auth/useAuth'

function guessName(meta: Record<string, unknown> | undefined): string {
  if (!meta) return ''
  const v =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    ''
  return v
}

export default function CompleteProfilePage() {
  const { user, profile, updateProfile } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState(
    profile?.full_name ?? guessName(user?.user_metadata),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please enter your name.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      await updateProfile({ full_name: name.trim() })
      navigate('/merchant', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your name.')
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <AppHeader />
      <main className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col justify-center px-5 py-12">
        <p className="eyebrow">One more step</p>
        <h1 className="mt-3 font-display text-2xl text-ink sm:text-3xl">
          What should we call you?
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          This is the name your team sees. You can change it in Settings later.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <TextField
            label="Full name"
            autoFocus
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex Tan"
          />
          {error ? <InlineError>{error}</InlineError> : null}
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={busy}
          >
            {busy ? 'Saving…' : 'Continue'}
          </button>
        </form>

        {user?.email ? (
          <p className="mt-6 text-xs text-muted">Signed in as {user.email}</p>
        ) : null}
      </main>
    </div>
  )
}
