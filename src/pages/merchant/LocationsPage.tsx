import { useState } from 'react'
import type { FormEvent } from 'react'
import { useStore } from '../../merchant/useStore'
import {
  createLocation,
  deleteLocation,
  updateLocation,
} from '../../merchant/api'
import type { StoreLocation } from '../../lib/database.types'
import {
  Card,
  InlineError,
  PageHeader,
  TextField,
} from '../../components/merchant/ui'

export default function LocationsPage() {
  const { activeStore, locations, isManager, refreshStore } = useStore()
  const [error, setError] = useState<string | null>(null)
  const primaryCount = locations.filter((location) => location.is_primary).length

  if (!activeStore) return null

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Locations"
        title={locations.length > 1 ? 'Store locations' : 'Your store'}
        description="Inventory is tracked per location, so the agent can tell customers exactly where a size is in stock."
      />

      {error ? <InlineError>{error}</InlineError> : null}

      <div className="space-y-3">
        {locations.map((loc) => (
          <LocationRow
            key={loc.id}
            location={loc}
            canManage={isManager}
            canDelete={
              isManager &&
              locations.length > 1 &&
              (!loc.is_primary || primaryCount > 1)
            }
            onChange={async (patch) => {
              setError(null)
              try {
                await updateLocation(loc.id, patch)
                await refreshStore()
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Update failed.')
              }
            }}
            onDelete={async () => {
              if (
                !window.confirm(
                  `Remove the location “${loc.name}”? Inventory records for this location will also be removed.`,
                )
              ) {
                return
              }
              setError(null)
              try {
                await deleteLocation(loc.id)
                await refreshStore()
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Delete failed.')
              }
            }}
          />
        ))}
      </div>

      {isManager && (
        <AddLocation
          onAdd={async (input) => {
            setError(null)
            try {
              await createLocation({ storeId: activeStore.id, ...input })
              await refreshStore()
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Could not add.')
            }
          }}
        />
      )}
    </div>
  )
}

function LocationRow({
  location,
  canManage,
  canDelete,
  onChange,
  onDelete,
}: {
  location: StoreLocation
  canManage: boolean
  canDelete: boolean
  onChange: (
    patch: Partial<Pick<StoreLocation, 'name' | 'city' | 'address' | 'is_primary'>>,
  ) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(location.name)
  const [city, setCity] = useState(location.city ?? '')
  const [address, setAddress] = useState(location.address ?? '')
  const [busy, setBusy] = useState(false)

  if (editing) {
    return (
      <Card className="space-y-3">
        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <TextField
            label="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-primary !py-2 text-sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              await onChange({
                name: name.trim(),
                city: city.trim() || null,
                address: address.trim() || null,
              })
              setBusy(false)
              setEditing(false)
            }}
          >
            Save
          </button>
          <button
            type="button"
            className="btn btn-secondary !py-2 text-sm"
            onClick={() => setEditing(false)}
          >
            Cancel
          </button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-ink">{location.name}</p>
          {location.is_primary && (
            <span className="rounded-full border border-line-strong px-2 py-0.5 text-[0.62rem] uppercase tracking-[0.12em] text-muted">
              Primary
            </span>
          )}
        </div>
        <p className="text-xs text-muted">
          {[location.city, location.address].filter(Boolean).join(' · ') ||
            'No address set'}
        </p>
      </div>
      {canManage && (
        <div className="flex gap-2">
          {!location.is_primary && (
            <button
              type="button"
              className="btn btn-secondary !px-3 !py-1.5 text-xs"
              onClick={() => onChange({ is_primary: true })}
            >
              Make primary
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary !px-3 !py-1.5 text-xs"
            onClick={() => setEditing(true)}
          >
            Edit
          </button>
          {canDelete && (
            <button
              type="button"
              className="btn btn-secondary !px-3 !py-1.5 text-xs"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                try {
                  await onDelete()
                } finally {
                  setBusy(false)
                }
              }}
            >
              {busy ? 'Removing…' : 'Remove'}
            </button>
          )}
        </div>
      )}
    </Card>
  )
}

function AddLocation({
  onAdd,
}: {
  onAdd: (input: { name: string; city?: string; address?: string }) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    await onAdd({ name, city })
    setName('')
    setCity('')
    setBusy(false)
  }

  return (
    <Card>
      <p className="text-sm font-medium text-ink">Add a location</p>
      <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-3">
        <TextField
          label="Name"
          className="min-w-40 flex-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Orchard"
        />
        <TextField
          label="City"
          className="min-w-40 flex-1"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Singapore"
        />
        <button
          type="submit"
          className="btn btn-primary shrink-0"
          disabled={busy}
        >
          {busy ? 'Adding…' : 'Add'}
        </button>
      </form>
    </Card>
  )
}
