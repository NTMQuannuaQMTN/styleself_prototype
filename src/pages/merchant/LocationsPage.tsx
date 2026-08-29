import { useState } from 'react'
import type { FormEvent } from 'react'
import { useStore } from '../../merchant/useStore'
import { updateLocation } from '../../merchant/api'
import type { StoreLocation } from '../../lib/database.types'
import {
  Card,
  EmptyState,
  InlineError,
  PageHeader,
  TextField,
} from '../../components/merchant/ui'

export default function LocationsPage() {
  const { activeStore, locations, isManager, memberLocationId, refreshStore } = useStore()

  if (!activeStore) return null

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Locations"
        title={locations.length > 1 ? 'Store locations' : 'Store location'}
        description="Manage the locations where your products are available."
      />

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
              onSave={async (patch) => {
                await updateLocation(location.id, patch)
                await refreshStore()
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function LocationForm({
  location,
  canEdit,
  onSave,
}: {
  location: StoreLocation
  canEdit: boolean
  onSave: (
    patch: Pick<StoreLocation, 'name' | 'address' | 'city'>,
  ) => Promise<void>
}) {
  const [name, setName] = useState(location.name)
  const [address, setAddress] = useState(location.address ?? '')
  const [city, setCity] = useState(location.city ?? '')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <Card>
      <form onSubmit={submit} className="max-w-lg space-y-4">
        <TextField
          label="Location name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Orchard"
          disabled={!canEdit}
          plain={!canEdit}
        />
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
        ) : (
          <p className="text-sm text-muted">
            Only owners and admins can edit the location.
          </p>
        )}
      </form>
    </Card>
  )
}
