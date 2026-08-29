import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../../merchant/useStore'
import { useAsync } from '../../merchant/useAsync'
import {
  createProduct,
  createVariant,
  deleteProduct,
  deleteVariant,
  getProduct,
  setInventory,
  updateProduct,
  type ProductWithVariants,
} from '../../merchant/api'
import { moneyToInput, parseMoney } from '../../merchant/money'
import type { ProductStatus, StoreLocation } from '../../lib/database.types'
import {
  Card,
  InlineError,
  LoadingRow,
  PageHeader,
  SelectField,
  TextArea,
  TextField,
} from '../../components/merchant/ui'

const STATUSES: ProductStatus[] = ['active', 'draft', 'archived']

export default function ProductEditorPage() {
  const { productId } = useParams()
  const { activeStore, agent, locations, isManager } = useStore()
  const navigate = useNavigate()

  const loaded = useAsync(
    () => (productId ? getProduct(productId) : Promise.resolve(null)),
    [productId],
  )

  if (!activeStore) return null

  if (!productId) {
    return (
      <CreateProduct
        storeId={activeStore.id}
        currency={agent?.currency ?? 'USD'}
        disabled={!isManager}
        onCreated={(id) => navigate(`/merchant/catalog/${id}`, { replace: true })}
      />
    )
  }

  if (loaded.loading) return <LoadingRow label="Loading product…" />
  if (loaded.error) return <InlineError>{loaded.error}</InlineError>
  if (!loaded.data)
    return (
      <p className="text-sm text-muted">
        Product not found.{' '}
        <Link to="/merchant/catalog" className="text-accent">
          Back to catalog
        </Link>
      </p>
    )

  return (
    <EditProduct
      key={loaded.data.id}
      product={loaded.data}
      locations={locations}
      currency={agent?.currency ?? 'USD'}
      canManage={isManager}
      onReload={loaded.reload}
      onDeleted={() => navigate('/merchant/catalog', { replace: true })}
    />
  )
}

// ---------------------------------------------------------------------------
function CreateProduct({
  storeId,
  currency,
  disabled,
  onCreated,
}: {
  storeId: string
  currency: string
  disabled: boolean
  onCreated: (id: string) => void
}) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const cents = parseMoney(price)
    if (!name.trim() || cents === null) {
      setError('A name and a valid price are required.')
      return
    }
    setBusy(true)
    try {
      const product = await createProduct({
        storeId,
        name,
        category,
        priceCents: cents,
        currency,
      })
      onCreated(product.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create product.')
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Catalog"
        title="New product"
        description="Add the basics now — variants and inventory come next."
      />
      {disabled ? (
        <InlineError>Only owners and admins can add products.</InlineError>
      ) : (
        <form onSubmit={submit} className="max-w-lg space-y-4">
          <TextField
            label="Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Linen Blazer"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label={`Price (${currency})`}
              required
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="89"
            />
            <TextField
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Jackets"
            />
          </div>
          {error ? <InlineError>{error}</InlineError> : null}
          <div className="flex gap-3">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Creating…' : 'Create product'}
            </button>
            <Link to="/merchant/catalog" className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
function EditProduct({
  product,
  locations,
  currency,
  canManage,
  onReload,
  onDeleted,
}: {
  product: ProductWithVariants
  locations: StoreLocation[]
  currency: string
  canManage: boolean
  onReload: () => void
  onDeleted: () => void
}) {
  const [name, setName] = useState(product.name)
  const [description, setDescription] = useState(product.description ?? '')
  const [category, setCategory] = useState(product.category ?? '')
  const [price, setPrice] = useState(moneyToInput(product.price_cents))
  const [imageUrl, setImageUrl] = useState(product.image_url ?? '')
  const [status, setStatus] = useState<ProductStatus>(product.status)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function saveDetails(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const cents = parseMoney(price)
    if (!name.trim() || cents === null) {
      setError('A name and a valid price are required.')
      return
    }
    setSaving(true)
    try {
      await updateProduct(product.id, {
        name: name.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
        price_cents: cents,
        image_url: imageUrl.trim() || null,
        status,
      })
      onReload()
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Catalog"
        title={product.name}
        description={
          <Link to="/merchant/catalog" className="text-accent">
            ← All products
          </Link>
        }
      />

      {!canManage && (
        <InlineError>You have view-only access to the catalog.</InlineError>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
        <form onSubmit={saveDetails} className="space-y-4">
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canManage}
          />
          <TextArea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Relaxed-fit linen blazer, half-lined, natural shoulder."
            disabled={!canManage}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label={`Price (${currency})`}
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={!canManage}
            />
            <TextField
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={!canManage}
            />
          </div>
          <TextField
            label="Image URL"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…"
            disabled={!canManage}
          />
          <SelectField
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProductStatus)}
            disabled={!canManage}
          >
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </SelectField>

          {error ? <InlineError>{error}</InlineError> : null}

          {canManage && (
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save details'}
              </button>
              {saved && <span className="text-sm text-success">Saved</span>}
              <button
                type="button"
                className="ml-auto text-xs text-muted hover:text-[#8f3a24]"
                onClick={async () => {
                  if (!confirm(`Delete "${product.name}"?`)) return
                  try {
                    await deleteProduct(product.id)
                    onDeleted()
                  } catch (err) {
                    setError(
                      err instanceof Error ? err.message : 'Delete failed.',
                    )
                  }
                }}
              >
                Delete product
              </button>
            </div>
          )}
        </form>

        <div className="space-y-4">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="aspect-[4/5] w-full rounded-[14px] border border-line object-cover"
            />
          ) : (
            <div className="flex aspect-[4/5] w-full items-center justify-center rounded-[14px] border border-dashed border-line-strong text-xs text-muted">
              No image
            </div>
          )}
        </div>
      </div>

      <VariantsSection
        product={product}
        locations={locations}
        currency={currency}
        canManage={canManage}
        onReload={onReload}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
function VariantsSection({
  product,
  locations,
  currency,
  canManage,
  onReload,
}: {
  product: ProductWithVariants
  locations: StoreLocation[]
  currency: string
  canManage: boolean
  onReload: () => void
}) {
  const [label, setLabel] = useState('')
  const [sku, setSku] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function addVariant(e: FormEvent) {
    e.preventDefault()
    if (!label.trim()) return
    setError(null)
    setBusy(true)
    try {
      await createVariant({ productId: product.id, label, sku })
      setLabel('')
      setSku('')
      onReload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add variant.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <p className="font-display text-lg text-ink">Variants & inventory</p>
      <p className="mt-1 text-sm text-muted">
        Add sizes or colors, then set stock per location.
      </p>

      {product.variants.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          No variants yet. Add one below (e.g. “Size M” or “M / Black”).
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-[0.1em] text-muted">
                <th className="py-2 pr-3 font-medium">Variant</th>
                {locations.map((loc) => (
                  <th key={loc.id} className="py-2 px-2 font-medium">
                    {loc.name}
                  </th>
                ))}
                {canManage && <th className="py-2" />}
              </tr>
            </thead>
            <tbody>
              {product.variants.map((v) => (
                <tr key={v.id} className="border-b border-line last:border-0">
                  <td className="py-2 pr-3">
                    <p className="font-medium text-ink">{v.label}</p>
                    {v.sku && (
                      <p className="text-xs text-muted">{v.sku}</p>
                    )}
                  </td>
                  {locations.map((loc) => {
                    const row = v.inventory.find(
                      (i) => i.location_id === loc.id,
                    )
                    return (
                      <td key={loc.id} className="px-2 py-2">
                        <InventoryInput
                          variantId={v.id}
                          locationId={loc.id}
                          initial={row?.quantity ?? 0}
                          disabled={!canManage}
                          onSaved={onReload}
                        />
                      </td>
                    )
                  })}
                  {canManage && (
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        className="text-xs text-muted hover:text-[#8f3a24]"
                        onClick={async () => {
                          await deleteVariant(v.id)
                          onReload()
                        }}
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canManage && (
        <form
          onSubmit={addVariant}
          className="mt-5 flex flex-wrap items-end gap-3 border-t border-line pt-5"
        >
          <TextField
            label="Variant label"
            className="min-w-36 flex-1"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Size M"
          />
          <TextField
            label="SKU (optional)"
            className="min-w-36 flex-1"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="LB-M"
          />
          <button
            type="submit"
            className="btn btn-secondary shrink-0"
            disabled={busy}
          >
            {busy ? 'Adding…' : 'Add variant'}
          </button>
        </form>
      )}
      {error ? (
        <div className="mt-2">
          <InlineError>{error}</InlineError>
        </div>
      ) : null}
      <p className="mt-3 text-xs text-muted">Prices shown in {currency}.</p>
    </Card>
  )
}

function InventoryInput({
  variantId,
  locationId,
  initial,
  disabled,
  onSaved,
}: {
  variantId: string
  locationId: string
  initial: number
  disabled: boolean
  onSaved: () => void
}) {
  const [value, setValue] = useState(String(initial))
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle')

  async function commit() {
    const qty = Math.max(0, Math.round(Number(value) || 0))
    if (qty === initial) return
    setState('saving')
    try {
      await setInventory(variantId, locationId, qty)
      setState('idle')
      onSaved()
    } catch {
      setState('error')
    }
  }

  return (
    <input
      type="number"
      min={0}
      inputMode="numeric"
      value={value}
      disabled={disabled}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      className={`w-16 rounded-md border bg-surface px-2 py-1 text-sm ${
        state === 'error' ? 'border-[#b4482f]' : 'border-line-strong'
      } ${state === 'saving' ? 'opacity-60' : ''}`}
    />
  )
}
