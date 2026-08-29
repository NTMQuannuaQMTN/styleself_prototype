import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../../merchant/useStore'
import { useAsync } from '../../merchant/useAsync'
import {
  deleteAllProducts,
  deleteProduct,
  listProducts,
  type ProductWithVariants,
} from '../../merchant/api'
import { formatMoney } from '../../merchant/money'
import { templateCsv } from '../../merchant/catalogTemplate'
import {
  Card,
  EmptyState,
  InlineError,
  LoadingRow,
  PageHeader,
} from '../../components/merchant/ui'

function stockOf(p: ProductWithVariants, locationId?: string | null) {
  return p.variants.reduce(
    (sum, v) =>
      sum +
      v.inventory.reduce(
        (s, i) =>
          s +
          (locationId && i.location_id !== locationId
            ? 0
            : Number.isFinite(Number(i.quantity))
              ? Number(i.quantity)
              : 0),
        0,
      ),
    0,
  )
}

function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: 'text/csv;charset=utf-8' }),
  )
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function CatalogPage() {
  const { activeStore, locations, isManager, memberLocationId } = useStore()
  const canAddProduct = isManager || Boolean(memberLocationId)
  const [deletingAll, setDeletingAll] = useState(false)
  const [deleteAllError, setDeleteAllError] = useState<string | null>(null)
  const activeStoreId = activeStore?.id
  const products = useAsync(
    () =>
      activeStoreId
        ? listProducts(activeStoreId)
        : Promise.resolve([] as ProductWithVariants[]),
    [activeStoreId],
  )

  if (!activeStore) return null
  const store = activeStore

  async function removeAllProducts() {
    if (
      !confirm(
        'Delete all catalog entries? This permanently removes every product, variant, and inventory entry in this store. This cannot be undone.',
      )
    )
      return

    setDeletingAll(true)
    setDeleteAllError(null)
    try {
      await deleteAllProducts(store.id)
      products.reload()
    } catch (err) {
      setDeleteAllError(
        err instanceof Error ? err.message : 'Could not delete catalog entries.',
      )
    } finally {
      setDeletingAll(false)
    }
  }

  const stockColHint =
    locations.length > 1
      ? locations
          .map(
            (l) =>
              `stock_${l.name.trim().toLowerCase().replace(/\s+/g, '_')}`,
          )
          .join(', ')
      : 'stock'

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Catalog"
        title="Products"
        description="What the agent can discover, compare, and sell."
        action={
          canAddProduct ? (
            <Link to="/merchant/catalog/new" className="btn btn-primary">
              Add product
            </Link>
          ) : undefined
        }
      />

      {canAddProduct && (
        <Card className="bg-accent-soft/35">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <span
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line-strong bg-surface text-ink"
                aria-hidden
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3v12" />
                  <path d="m8 11 4 4 4-4" />
                  <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                </svg>
              </span>
              <div>
                <p className="font-display text-base text-ink">
                  Bulk update with a CSV
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  Match rows to products by{' '}
                  <code className="rounded bg-surface px-1 py-0.5 font-mono text-[0.8em] text-ink-soft">
                    sku
                  </code>
                  , update stock and details in place, add new products. Nothing
                  is deleted.
                </p>
                <p className="mt-1.5 text-xs text-muted">
                  Stock column{locations.length > 1 ? 's' : ''}:{' '}
                  <code className="font-mono text-ink-soft">{stockColHint}</code>
                  {' · '}
                  <Link
                    to="/merchant/catalog/import"
                    className="text-accent underline"
                  >
                    how the columns work
                  </Link>
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={() =>
                  downloadText(
                    `${store.slug}-catalog-template.csv`,
                    templateCsv(locations),
                  )
                }
                className="btn btn-secondary !bg-surface !py-2 text-sm"
              >
                Get template
              </button>
              <Link
                to="/merchant/catalog/import"
                className="btn btn-primary !py-2 text-sm"
              >
                Import CSV
              </Link>
              {isManager ? (
                <button
                  type="button"
                  onClick={removeAllProducts}
                  disabled={deletingAll}
                  className="btn btn-secondary !py-2 text-sm text-[#8f3a24] hover:bg-[#8f3a24]/10"
                >
                  {deletingAll ? 'Deleting…' : 'Delete all entries'}
                </button>
              ) : null}
            </div>
          </div>
          {deleteAllError ? (
            <p className="border-t border-line px-4 py-2 text-xs text-[#8f3a24]">
              {deleteAllError}
            </p>
          ) : null}
        </Card>
      )}

      {products.loading ? (
        <LoadingRow label="Loading products…" />
      ) : products.error ? (
        <InlineError>{products.error}</InlineError>
      ) : !products.data || products.data.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Add products one at a time below, or use the CSV import above to load your whole catalog at once."
          action={
            canAddProduct ? (
              <Link to="/merchant/catalog/new" className="btn btn-primary">
                Add product
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-[14px] border border-line">
          {products.data.map((p, i) => (
            <ProductRow
              key={p.id}
              product={p}
              first={i === 0}
              canManage={
                isManager || (!!memberLocationId && p.location_id === memberLocationId)
              }
              onDeleted={products.reload}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ProductRow({
  product: p,
  first,
  canManage,
  onDeleted,
}: {
  product: ProductWithVariants
  first: boolean
  canManage: boolean
  onDeleted: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function remove() {
    if (!confirm(`Delete "${p.name}"? This removes its variants and stock too.`))
      return
    setBusy(true)
    setError(null)
    try {
      await deleteProduct(p.id)
      onDeleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
      setBusy(false)
    }
  }

  return (
    <div
      className={`flex items-center gap-3 bg-surface px-4 py-3 transition-colors hover:bg-black/[0.02] ${
        first ? '' : 'border-t border-line'
      } ${busy ? 'opacity-50' : ''}`}
    >
      <Link
        to={`/merchant/catalog/${p.id}`}
        className="flex min-w-0 flex-1 items-center gap-4"
      >
        <div className="h-12 w-10 shrink-0 overflow-hidden rounded-md border border-line bg-paper">
          {p.image_url ? (
            <img
              src={p.image_url}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{p.name}</p>
          <p className="text-xs text-muted">
            {p.merchant_sku ? (
              <span className="font-mono text-ink-soft">{p.merchant_sku}</span>
            ) : null}
            {p.merchant_sku ? ' · ' : ''}
            {p.category || 'Uncategorized'} · {p.variants.length} variant
            {p.variants.length === 1 ? '' : 's'}
          </p>
          {error ? (
            <p className="mt-0.5 text-xs text-[#8f3a24]">{error}</p>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm text-ink">
            {formatMoney(p.price_cents, p.currency)}
          </p>
          <p className="text-xs text-muted">{stockOf(p)} in stock</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[0.62rem] uppercase tracking-[0.1em] ${
            p.status === 'active'
              ? 'bg-success/12 text-success'
              : 'bg-line text-muted'
          }`}
        >
          {p.status}
        </span>
      </Link>

      {canManage ? (
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          aria-label={`Delete ${p.name}`}
          title="Delete product"
          className="shrink-0 rounded-md p-1.5 text-muted transition-colors hover:bg-[#8f3a24]/10 hover:text-[#8f3a24]"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
          </svg>
        </button>
      ) : null}
    </div>
  )
}
