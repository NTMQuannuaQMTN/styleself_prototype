import { Link } from 'react-router-dom'
import { useStore } from '../../merchant/useStore'
import { useAsync } from '../../merchant/useAsync'
import { listProducts, type ProductWithVariants } from '../../merchant/api'
import { formatMoney } from '../../merchant/money'
import {
  EmptyState,
  InlineError,
  LoadingRow,
  PageHeader,
} from '../../components/merchant/ui'

function stockOf(p: ProductWithVariants) {
  return p.variants.reduce(
    (sum, v) => sum + v.inventory.reduce((s, i) => s + i.quantity, 0),
    0,
  )
}

export default function CatalogPage() {
  const { activeStore, isManager } = useStore()
  const products = useAsync(
    () => listProducts(activeStore!.id),
    [activeStore?.id],
  )

  if (!activeStore) return null

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Catalog"
        title="Products"
        description="What the agent can discover, compare, and sell."
        action={
          isManager ? (
            <Link to="/merchant/catalog/new" className="btn btn-primary">
              Add product
            </Link>
          ) : undefined
        }
      />

      {products.loading ? (
        <LoadingRow label="Loading products…" />
      ) : products.error ? (
        <InlineError>{products.error}</InlineError>
      ) : !products.data || products.data.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Add your first product so the agent has something to recommend."
          action={
            isManager ? (
              <Link to="/merchant/catalog/new" className="btn btn-primary">
                Add product
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-[14px] border border-line">
          {products.data.map((p, i) => (
            <Link
              key={p.id}
              to={`/merchant/catalog/${p.id}`}
              className={`flex items-center gap-4 bg-surface px-4 py-3 transition-colors hover:bg-black/[0.02] ${
                i > 0 ? 'border-t border-line' : ''
              }`}
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
                <p className="truncate text-sm font-medium text-ink">
                  {p.name}
                </p>
                <p className="text-xs text-muted">
                  {p.category || 'Uncategorized'} · {p.variants.length} variant
                  {p.variants.length === 1 ? '' : 's'}
                </p>
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
          ))}
        </div>
      )}
    </div>
  )
}
