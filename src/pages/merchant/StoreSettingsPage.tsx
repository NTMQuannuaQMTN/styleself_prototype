import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../merchant/useStore'
import { deleteStore, toSlug, updateStore } from '../../merchant/api'
import {
  Card,
  InlineError,
  PageHeader,
  TextField,
} from '../../components/merchant/ui'

export default function StoreSettingsPage() {
  const {
    activeStore,
    activeRole,
    isManager,
    refreshStore,
    refreshMemberships,
    setActiveStore,
    memberships,
  } = useStore()
  const navigate = useNavigate()

  if (!activeStore) return null
  const store = activeStore
  const isOwner = activeRole === 'owner'

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Store"
        title="Store settings"
        description="Your store's identity and public address."
      />

      {!isManager && (
        <InlineError>
          Only owners and admins can change store settings.
        </InlineError>
      )}

      <div className="space-y-6">
        <DetailsCard
          name={store.name}
          branchName={store.branch_name ?? ''}
          address={store.headquarters ?? ''}
          city={store.city ?? ''}
          canEdit={isManager}
          onSave={async (patch) => {
            await updateStore(store.id, patch)
            await Promise.all([refreshStore(), refreshMemberships()])
          }}
        />

        <SlugCard
          slug={store.slug}
          canEdit={isManager}
          onSave={async (slug) => {
            await updateStore(store.id, { slug })
            await Promise.all([refreshStore(), refreshMemberships()])
          }}
        />

        {isOwner && (
          <DangerZone
            storeName={store.name}
            onDelete={async () => {
              await deleteStore(store.id)
              const remaining = memberships.filter(
                (m) => m.store.id !== store.id,
              )
              await refreshMemberships()
              if (remaining[0]) setActiveStore(remaining[0].store.id)
              navigate('/merchant', { replace: true })
            }}
          />
        )}
      </div>
    </div>
  )
}

function DetailsCard({
  name,
  branchName,
  address,
  city,
  canEdit,
  onSave,
}: {
  name: string
  branchName: string
  address: string
  city: string
  canEdit: boolean
  onSave: (patch: {
    name: string
    branch_name: string | null
    headquarters: string | null
    city: string | null
  }) => Promise<void>
}) {
  const [n, setN] = useState(name)
  const [branch, setBranch] = useState(branchName)
  const [addr, setAddr] = useState(address)
  const [c, setC] = useState(city)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dirty =
    n.trim() !== name.trim() ||
    branch.trim() !== branchName.trim() ||
    addr.trim() !== address.trim() ||
    c.trim() !== city.trim()

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!n.trim()) {
      setError('Store name cannot be empty.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      await onSave({
        name: n.trim(),
        branch_name: branch.trim() || null,
        headquarters: addr.trim() || null,
        city: c.trim() || null,
      })
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
        <p className="font-display text-lg text-ink">Details</p>
        <TextField
          label="Store name"
          value={n}
          onChange={(e) => setN(e.target.value)}
          disabled={!canEdit}
        />
        <TextField
          label="Branch name"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          placeholder="Orchard"
          hint="Used in the store switcher to tell branches apart."
          disabled={!canEdit}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Address"
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            placeholder="391 Orchard Rd"
            disabled={!canEdit}
          />
          <TextField
            label="Location"
            value={c}
            onChange={(e) => setC(e.target.value)}
            placeholder="Singapore"
            disabled={!canEdit}
          />
        </div>
        {error ? <InlineError>{error}</InlineError> : null}
        {canEdit && (
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
        )}
      </form>
    </Card>
  )
}

function SlugCard({
  slug,
  canEdit,
  onSave,
}: {
  slug: string
  canEdit: boolean
  onSave: (slug: string) => Promise<void>
}) {
  const [value, setValue] = useState(slug)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const normalized = toSlug(value)
  const dirty = normalized !== slug

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!normalized) {
      setError('Enter a valid address (letters, numbers, hyphens).')
      return
    }
    setError(null)
    setBusy(true)
    try {
      await onSave(normalized)
      setValue(normalized)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save.'
      setError(
        /duplicate|unique/i.test(msg)
          ? 'That address is already taken.'
          : msg,
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <p className="font-display text-lg text-ink">Public address</p>
          <p className="mt-1 text-sm text-muted">
            Where your agent lives. Changing it breaks any embed already on your
            site.
          </p>
        </div>
        <div>
          <span className="field-label">Agent URL</span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-muted">styleself.app/agent/</span>
            <input
              className="field-input flex-1"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          {normalized !== value && (
            <p className="mt-1.5 text-xs text-muted">
              Saved as <code>{normalized || '—'}</code>
            </p>
          )}
        </div>
        {error ? <InlineError>{error}</InlineError> : null}
        {canEdit && (
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="btn btn-secondary"
              disabled={busy || !dirty}
            >
              {busy ? 'Saving…' : 'Update address'}
            </button>
            {saved && <span className="text-sm text-success">Saved</span>}
          </div>
        )}
      </form>
    </Card>
  )
}

function DangerZone({
  storeName,
  onDelete,
}: {
  storeName: string
  onDelete: () => Promise<void>
}) {
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    setError(null)
    setBusy(true)
    try {
      await onDelete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete.')
      setBusy(false)
    }
  }

  return (
    <Card className="border-[#e2b9ad]">
      <p className="font-display text-lg text-ink">Delete this store</p>
      <p className="mt-1 text-sm text-muted">
        Permanently removes the store, its catalog, locations, team, and agent
        configuration. This can't be undone.
      </p>
      <div className="mt-4 max-w-sm space-y-3">
        <TextField
          label={`Type "${storeName}" to confirm`}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error ? <InlineError>{error}</InlineError> : null}
        <button
          type="button"
          className="btn btn-primary !bg-[#8f3a24] !border-[#8f3a24]"
          disabled={busy || confirm.trim() !== storeName.trim()}
          onClick={remove}
        >
          {busy ? 'Deleting…' : 'Delete store'}
        </button>
      </div>
    </Card>
  )
}
