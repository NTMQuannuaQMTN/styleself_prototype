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
  variantLabel,
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
const GENDERS = ['', 'Mens', 'Womens', 'Unisex', 'Kids']
const COMMON_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One size']

type Attributes = {
  description: string
  brand: string
  style: string
  gender: string
  material: string
  care: string
  category: string
}

const EMPTY_ATTRS: Attributes = {
  description: '',
  brand: '',
  style: '',
  gender: '',
  material: '',
  care: '',
  category: '',
}

type VariantRow = { size: string; color: string; qty: string }

// ---------------------------------------------------------------------------
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
        locations={locations}
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
function AttributeFields({
  attrs,
  onChange,
  currency,
  price,
  onPrice,
  disabled,
}: {
  attrs: Attributes
  onChange: (next: Attributes) => void
  currency: string
  price: string
  onPrice: (v: string) => void
  disabled?: boolean
}) {
  const set = (k: keyof Attributes) => (v: string) =>
    onChange({ ...attrs, [k]: v })

  return (
    <>
      <TextArea
        label="Description"
        value={attrs.description}
        onChange={(e) => set('description')(e.target.value)}
        rows={3}
        placeholder="Relaxed-fit linen blazer, half-lined, natural shoulder."
        disabled={disabled}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Brand"
          value={attrs.brand}
          onChange={(e) => set('brand')(e.target.value)}
          placeholder="Urban Thread"
          disabled={disabled}
        />
        <TextField
          label="Category"
          value={attrs.category}
          onChange={(e) => set('category')(e.target.value)}
          placeholder="Jackets"
          disabled={disabled}
        />
        <TextField
          label="Style"
          value={attrs.style}
          onChange={(e) => set('style')(e.target.value)}
          placeholder="Smart casual"
          disabled={disabled}
        />
        <SelectField
          label="Gender"
          value={attrs.gender}
          onChange={(e) => set('gender')(e.target.value)}
          disabled={disabled}
        >
          {GENDERS.map((g) => (
            <option key={g} value={g}>
              {g || '—'}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Material"
          value={attrs.material}
          onChange={(e) => set('material')(e.target.value)}
          placeholder="100% linen"
          disabled={disabled}
        />
        <TextField
          label={`Price (${currency})`}
          inputMode="decimal"
          value={price}
          onChange={(e) => onPrice(e.target.value)}
          placeholder="89"
          disabled={disabled}
        />
      </div>
      <TextField
        label="Care instructions"
        value={attrs.care}
        onChange={(e) => set('care')(e.target.value)}
        placeholder="Machine wash cold, hang dry"
        disabled={disabled}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
function CreateProduct({
  storeId,
  currency,
  locations,
  disabled,
  onCreated,
}: {
  storeId: string
  currency: string
  locations: StoreLocation[]
  disabled: boolean
  onCreated: (id: string) => void
}) {
  const primaryLocation =
    locations.find((l) => l.is_primary) ?? locations[0] ?? null

  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [attrs, setAttrs] = useState<Attributes>(EMPTY_ATTRS)
  const [rows, setRows] = useState<VariantRow[]>([])
  const [size, setSize] = useState('')
  const [color, setColor] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addRow(nextSize: string, nextColor: string) {
    const s = nextSize.trim()
    const c = nextColor.trim()
    if (!s && !c) return
    const dupe = rows.some(
      (r) =>
        r.size.toLowerCase() === s.toLowerCase() &&
        r.color.toLowerCase() === c.toLowerCase(),
    )
    if (dupe) return
    setRows((r) => [...r, { size: s, color: c, qty: '0' }])
    setSize('')
    setColor('')
  }

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
        priceCents: cents,
        currency,
        description: attrs.description,
        brand: attrs.brand,
        style: attrs.style,
        gender: attrs.gender,
        material: attrs.material,
        care: attrs.care,
        category: attrs.category,
      })

      for (const row of rows) {
        const variant = await createVariant({
          productId: product.id,
          size: row.size || null,
          color: row.color || null,
        })
        const qty = Math.max(0, Math.round(Number(row.qty) || 0))
        if (primaryLocation && qty > 0) {
          await setInventory(variant.id, primaryLocation.id, qty)
        }
      }

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
        description="Add the details, then the size / colour combinations and how many are in stock."
      />
      {disabled ? (
        <InlineError>Only owners and admins can add products.</InlineError>
      ) : (
        <form onSubmit={submit} className="max-w-xl space-y-4">
          <TextField
            label="Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Linen Blazer"
          />
          <AttributeFields
            attrs={attrs}
            onChange={setAttrs}
            currency={currency}
            price={price}
            onPrice={setPrice}
          />

          <div>
            <p className="field-label">Sizes, colours &amp; stock</p>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {COMMON_SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className="rounded-full border border-line-strong px-2.5 py-1 text-xs text-muted transition-colors hover:border-ink hover:text-ink"
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <TextField
                label="Size"
                className="w-24"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="M"
              />
              <TextField
                label="Colour / pattern"
                className="min-w-32 flex-1"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Navy"
              />
              <button
                type="button"
                className="btn btn-secondary shrink-0"
                onClick={() => addRow(size, color)}
              >
                Add
              </button>
            </div>

            {rows.length > 0 && (
              <div className="mt-3 space-y-2">
                {rows.map((row, i) => (
                  <div
                    key={`${row.size}|${row.color}`}
                    className="flex items-center gap-3"
                  >
                    <span className="w-32 shrink-0 text-sm font-medium text-ink">
                      {variantLabel(row)}
                    </span>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={row.qty}
                      onChange={(e) => {
                        const next = [...rows]
                        next[i] = { ...row, qty: e.target.value }
                        setRows(next)
                      }}
                      className="w-20 rounded-md border border-line-strong bg-surface px-2 py-1 text-sm"
                    />
                    <span className="text-xs text-muted">in stock</span>
                    <button
                      type="button"
                      onClick={() => setRows(rows.filter((_, j) => j !== i))}
                      className="ml-auto text-xs text-muted hover:text-[#8f3a24]"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <p className="text-xs text-muted">
                  Stock is recorded at{' '}
                  {primaryLocation?.name ?? 'your store'}
                  {locations.length > 1
                    ? ' — set the other locations from the product page.'
                    : '.'}
                </p>
              </div>
            )}
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
  const [price, setPrice] = useState(moneyToInput(product.price_cents))
  const [imageUrl, setImageUrl] = useState(product.image_url ?? '')
  const [status, setStatus] = useState<ProductStatus>(product.status)
  const [attrs, setAttrs] = useState<Attributes>({
    description: product.description ?? '',
    brand: product.brand ?? '',
    style: product.style ?? '',
    gender: product.gender ?? '',
    material: product.material ?? '',
    care: product.care ?? '',
    category: product.category ?? '',
  })

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
      const t = (v: string) => v.trim() || null
      await updateProduct(product.id, {
        name: name.trim(),
        description: t(attrs.description),
        brand: t(attrs.brand),
        style: t(attrs.style),
        gender: t(attrs.gender),
        material: t(attrs.material),
        care: t(attrs.care),
        category: t(attrs.category),
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

  const summary = [
    ['Brand', attrs.brand],
    ['Style', attrs.style],
    ['Gender', attrs.gender],
    ['Material', attrs.material],
    ['Care', attrs.care],
  ].filter(([, v]) => v)

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
          <AttributeFields
            attrs={attrs}
            onChange={setAttrs}
            currency={currency}
            price={price}
            onPrice={setPrice}
            disabled={!canManage}
          />
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
          {summary.length > 0 && (
            <dl className="rounded-[14px] border border-line bg-surface p-4 text-sm">
              {summary.map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between gap-3 py-1 first:pt-0 last:pb-0"
                >
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right text-ink">{v}</dd>
                </div>
              ))}
            </dl>
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
  const [size, setSize] = useState('')
  const [color, setColor] = useState('')
  const [sku, setSku] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function addVariant(e: FormEvent) {
    e.preventDefault()
    if (!size.trim() && !color.trim()) return
    setError(null)
    setBusy(true)
    try {
      await createVariant({
        productId: product.id,
        size: size || null,
        color: color || null,
        sku,
      })
      setSize('')
      setColor('')
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
      <p className="font-display text-lg text-ink">Sizes, colours &amp; stock</p>
      <p className="mt-1 text-sm text-muted">
        How many are left for every size / colour, per location.
      </p>

      {product.variants.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          No variants yet. Add a size and/or colour below.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-[0.1em] text-muted">
                <th className="py-2 pr-3 font-medium">Size · Colour</th>
                {locations.map((loc) => (
                  <th key={loc.id} className="px-2 py-2 font-medium">
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
                    <p className="font-medium text-ink">{variantLabel(v)}</p>
                    {v.sku && <p className="text-xs text-muted">{v.sku}</p>}
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
            label="Size"
            className="w-24"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            placeholder="M"
          />
          <TextField
            label="Colour / pattern"
            className="min-w-32 flex-1"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="Navy"
          />
          <TextField
            label="SKU (optional)"
            className="min-w-28 flex-1"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="LB-M-NVY"
          />
          <button
            type="submit"
            className="btn btn-secondary shrink-0"
            disabled={busy}
          >
            {busy ? 'Adding…' : 'Add'}
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
