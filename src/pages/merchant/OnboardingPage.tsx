import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AppHeader } from '../../components/app/AppHeader'
import { Card, InlineError, TextArea, TextField } from '../../components/merchant/ui'
import { useAuth } from '../../auth/useAuth'
import { useStore } from '../../merchant/useStore'
import {
  cancelJoinRequest,
  createStore,
  requestToJoin,
  searchStores,
  storeLabel,
} from '../../merchant/api'
import type { Store } from '../../lib/database.types'

type Mode = 'choose' | 'create' | 'join'

export default function OnboardingPage() {
  const { user } = useAuth()
  const { memberships, pendingRequests, refreshMemberships } = useStore()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('choose')

  if (memberships.length > 0) return <Navigate to="/merchant" replace />

  return (
    <div className="min-h-screen bg-paper">
      <AppHeader />
      <main className="mx-auto w-full max-w-xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="eyebrow">Merchant setup</p>
        <h1 className="mt-3 font-display text-2xl text-ink sm:text-3xl">
          Set up your store
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Create a new store, or ask to join one your team already runs.
        </p>

        {pendingRequests.length > 0 && (
          <div className="mt-8 space-y-3">
            {pendingRequests.map((req) => (
              <PendingCard
                key={req.id}
                storeName={req.store?.name ?? 'a store'}
                onCancel={async () => {
                  await cancelJoinRequest(req.id)
                  await refreshMemberships()
                }}
              />
            ))}
          </div>
        )}

        <div className="mt-8">
          {mode === 'choose' && <ChooseMode onPick={setMode} />}
          {mode === 'create' && (
            <CreateStore
              userId={user!.id}
              onBack={() => setMode('choose')}
              onDone={async () => {
                await refreshMemberships()
                navigate('/merchant', { replace: true })
              }}
            />
          )}
          {mode === 'join' && (
            <JoinStore
              userId={user!.id}
              onBack={() => setMode('choose')}
              onRequested={refreshMemberships}
            />
          )}
        </div>
      </main>
    </div>
  )
}

function PendingCard({
  storeName,
  onCancel,
}: {
  storeName: string
  onCancel: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  return (
    <Card className="flex items-center justify-between gap-4 !p-4">
      <div>
        <p className="text-sm font-medium text-ink">Request pending</p>
        <p className="text-xs text-muted">
          Waiting for an owner of <strong>{storeName}</strong> to approve you.
        </p>
      </div>
      <button
        type="button"
        className="btn btn-secondary !px-3 !py-1.5 text-xs"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          try {
            await onCancel()
          } finally {
            setBusy(false)
          }
        }}
      >
        Cancel
      </button>
    </Card>
  )
}

function ChooseMode({ onPick }: { onPick: (mode: Mode) => void }) {
  return (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={() => onPick('create')}
        className="group rounded-[14px] border border-line-strong bg-surface p-5 text-left transition-colors hover:border-ink"
      >
        <p className="font-display text-base text-ink">Create a new brand</p>
        <p className="mt-1 text-sm text-muted">
          Create a new store brand. You'll be the owner and can add branches and invite your team.
        </p>
      </button>
      <button
        type="button"
        onClick={() => onPick('join')}
        className="group rounded-[14px] border border-line-strong bg-surface p-5 text-left transition-colors hover:border-ink"
      >
        <p className="font-display text-base text-ink">Join an existing brand as a branch</p>
        <p className="mt-1 text-sm text-muted">
          Join an existing brand as a new branch. Your request will be sent to the brand owner for approval.
        </p>
      </button>
    </div>
  )
}

function CreateStore({
  userId,
  onBack,
  onDone,
}: {
  userId: string
  onBack: () => void
  onDone: () => Promise<void>
}) {
  const [name, setName] = useState('')
  const [branch, setBranch] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await createStore({
        name,
        branchName: branch,
        headquarters: address,
        city,
        userId,
      })
      await onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the store.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <TextField
        label="Store name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Urban Thread"
      />
      <TextField
        label="Branch name (optional)"
        value={branch}
        onChange={(e) => setBranch(e.target.value)}
        placeholder="Orchard"
        hint="Shown in the store switcher to tell branches apart."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Address (optional)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="391 Orchard Rd"
        />
        <TextField
          label="Location (optional)"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Singapore"
        />
      </div>
      {error ? <InlineError>{error}</InlineError> : null}
      <div className="flex gap-3 pt-1">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Creating…' : 'Create store'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onBack}
          disabled={busy}
        >
          Back
        </button>
      </div>
    </form>
  )
}

function JoinStore({
  userId,
  onBack,
  onRequested,
}: {
  userId: string
  onBack: () => void
  onRequested: () => Promise<void>
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Store[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function runSearch(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSearching(true)
    try {
      setResults(await searchStores(query))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed.')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={runSearch} className="flex gap-2">
        <TextField
          label="Find your store"
          className="flex-1"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by store name"
        />
        <button
          type="submit"
          className="btn btn-secondary mt-6 shrink-0"
          disabled={searching}
        >
          {searching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error ? <InlineError>{error}</InlineError> : null}

      {results && results.length === 0 && (
        <p className="text-sm text-muted">
          No stores match “{query}”. Check the spelling with your team, or create
          a new store.
        </p>
      )}

      {results && results.length > 0 && (
        <ul className="space-y-2">
          {results.map((store) => (
            <JoinResult
              key={store.id}
              store={store}
              userId={userId}
              onRequested={onRequested}
            />
          ))}
        </ul>
      )}

      <button type="button" className="btn btn-secondary" onClick={onBack}>
        Back
      </button>
    </div>
  )
}

function JoinResult({
  store,
  userId,
  onRequested,
}: {
  store: Store
  userId: string
  onRequested: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [location, setLocation] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    if (!location.trim()) {
      setError('Tell the owner which location you’re at.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      await requestToJoin({ storeId: store.id, userId, location, message })
      setSent(true)
      await onRequested()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not send the request.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="rounded-[12px] border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">
            {store.name}
            {storeLabel(store) ? (
              <span className="font-normal text-muted">
                {' '}
                · {storeLabel(store)}
              </span>
            ) : null}
          </p>
        </div>
        {sent ? (
          <span className="text-xs font-medium text-success">Request sent</span>
        ) : (
          <button
            type="button"
            className="btn btn-secondary !px-3 !py-1.5 text-xs"
            onClick={() => setOpen((v) => !v)}
          >
            Request to join
          </button>
        )}
      </div>
      {open && !sent && (
        <div className="mt-3 space-y-2 border-t border-line pt-3">
          <TextField
            label="Your store location / address"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="VivoCity, Singapore"
          />
          <TextArea
            label="Note to the owner (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hi — I manage the VivoCity branch."
            rows={2}
          />
          {error ? <InlineError>{error}</InlineError> : null}
          <button
            type="button"
            className="btn btn-primary !py-2 text-sm"
            onClick={send}
            disabled={busy}
          >
            {busy ? 'Sending…' : 'Send request'}
          </button>
        </div>
      )}
    </li>
  )
}
