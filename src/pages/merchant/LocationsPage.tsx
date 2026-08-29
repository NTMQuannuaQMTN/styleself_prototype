import { useState } from 'react'
import type { FormEvent } from 'react'
import { useStore } from '../../merchant/useStore'
import { createLocation, deleteLocation, updateLocation } from '../../merchant/api'
import type { StoreLocation } from '../../lib/database.types'
import {
  Card,
  EmptyState,
  InlineError,
  PageHeader,
  TextField,
} from '../../components/merchant/ui'

export default function LocationsPage() {
  const {
    activeStore,
    locations,
    isManager,
    memberLocationId,
    refreshStore,
  } = useStore()

  if (!activeStore) return null

  const canDelete = (location: StoreLocation) =>
    isManager && !location.is_primary && locations.length > 1

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Locations"
        title={locations.length > 1 ? 'Store locations' : 'Store location'}
        description={
          isManager
            ? 'Add the branches where your products are sold. Each product and its stock can be assigned to a location; the agent tells shoppers where an item is available.'
            : 'Manage the locations where your products are available.'
        }
      />

      {isManager ? (
        <AddLocationForm
          onCreate={async (input) => {
            await createLocation({ storeId: activeStore.id, ...input })
            await refreshStore()
          }}
        />
      ) : null}

      {locations.length === 0 ? (
        <EmptyState
          title="No locations on this store"
          description="This shouldn't happen — try reloading."
        />
      ) : (
        <div className="space-y-4">
          {locations.map((location) => (
            <LocationForm
              key={location.id}
              location={location}
              canEdit={isManager || location.id === memberLocationId}
              canDelete={canDelete(location)}
              onSave={async (patch) => {
                await updateLocation(location.id, patch)
                await refreshStore()
              }}
              onDelete={async () => {
                await deleteLocation(location.id)
                await refreshStore()
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function AddLocationForm({
  onCreate,
}: {
  onCreate: (input: {
    name: string
    city?: string
    address?: string
  }) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setName('')
    setAddress('')
    setCity('')
    setError(null)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('The location needs a name.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      await onCreate({
        name: name.trim(),
        address: address.trim() || undefined,
        city: city.trim() || undefined,
      })
      reset()
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the location.')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-primary"
      >
        Add a location
      </button>
    )
  }

  return (
    <Card>
      <form onSubmit={submit} className="max-w-lg space-y-4">
        <p className="text-sm font-medium text-ink">New location</p>
        <TextField
          label="Location name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Orchard"
          autoFocus
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="391 Orchard Rd"
          />
          <TextField
            label="City / area"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Singapore"
          />
        </div>
        {error ? <InlineError>{error}</InlineError> : null}
        <div className="flex items-center gap-3">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Adding…' : 'Add location'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              reset()
              setOpen(false)
            }}
            disabled={busy}
          >
            Cancel
          </button>
        </div>
      </form>
    </Card>
  )
}

function LocationForm({
  location,
  canEdit,
  canDelete,
  onSave,
  onDelete,
}: {
  location: StoreLocation
  canEdit: boolean
  canDelete: boolean
  onSave: (
    patch: Pick<StoreLocation, 'name' | 'address' | 'city'>,
  ) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [name, setName] = useState(location.name)
  const [address, setAddress] = useState(location.address ?? '')
  const [city, setCity] = useState(location.city ?? '')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const dirty =
    name.trim() !== location.name.trim() ||
    address.trim() !== (location.address ?? '').trim() ||
    city.trim() !== (location.city ?? '').trim()

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('The location needs a name.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      await onSave({
        name: name.trim(),
        address: address.trim() || null,
        city: city.trim() || null,
      })
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setError(null)
    setBusy(true)
    try {
      await onDelete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the location.')
      setBusy(false)
      setConfirmDelete(false)
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="max-w-lg space-y-4">
        <div className="flex items-center justify-between gap-3">
          <TextField
            label="Location name"
            className="flex-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Orchard"
            disabled={!canEdit}
            plain={!canEdit}
          />
          {location.is_primary ? (
            <span className="mt-5 shrink-0 rounded-full bg-line px-2 py-0.5 text-[0.68rem] text-muted">
              Primary
            </span>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="391 Orchard Rd"
            disabled={!canEdit}
            plain={!canEdit}
          />
          <TextField
            label="City / area"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Singapore"
            disabled={!canEdit}
            plain={!canEdit}
          />
        </div>
        {error ? <InlineError>{error}</InlineError> : null}
        {canEdit ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={busy || !dirty}
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
            {saved && <span className="text-sm text-success">Saved</span>}
            {canDelete ? (
              confirmDelete ? (
                <span className="ml-auto flex items-center gap-2 text-sm">
                  <span className="text-muted">Delete this location?</span>
                  <button
                    type="button"
                    onClick={remove}
                    disabled={busy}
                    className="rounded-md px-3 py-1.5 text-[#8f3a24] transition-colors hover:bg-[#8f3a24]/10"
                  >
                    {busy ? 'Deleting…' : 'Delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    disabled={busy}
                    className="text-muted underline"
                  >
                    Keep
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="ml-auto text-sm text-[#8f3a24] underline"
                >
                  Delete
                </button>
              )
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted">
            Only owners and admins can edit the location.
          </p>
        )}
        {canDelete && confirmDelete ? (
          <p className="text-xs text-muted">
            Its stock counts are removed. Products stocked only here stay in the
            catalog as brand-wide, and team members assigned here are unlinked.
            This can&apos;t be undone.
          </p>
        ) : null}
      </form>
    </Card>
  )
}
