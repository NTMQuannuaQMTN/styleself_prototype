import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../../merchant/useStore'
import { useAsync } from '../../merchant/useAsync'
import { listProducts } from '../../merchant/api'
import {
  AgentWidget,
  type AgentProduct,
} from '../../components/agent/AgentWidget'
import { EmptyState, LoadingRow, PageHeader } from '../../components/merchant/ui'

export default function PreviewPage() {
  const { activeStore, agent, locations } = useStore()
  const products = useAsync(
    () => listProducts(activeStore!.id),
    [activeStore?.id],
  )

  const agentProducts = useMemo<AgentProduct[]>(
    () =>
      (products.data ?? [])
        .filter((p) => p.status === 'active')
        .map((p) => {
          const stockByLocation: Record<string, number> = {}
          for (const v of p.variants) {
            for (const inv of v.inventory) {
              stockByLocation[inv.location_id] =
                (stockByLocation[inv.location_id] ?? 0) + inv.quantity
            }
          }
          return {
            id: p.id,
            name: p.name,
            category: p.category,
            description: p.description,
            priceCents: p.price_cents,
            imageUrl: p.image_url,
            stockByLocation,
          }
        }),
    [products.data],
  )

  if (!activeStore) return null

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Preview"
        title="Talk to your agent"
        description="A working preview over this store's real catalog and inventory. Conversational reasoning is added in the AI phase."
      />

      {products.loading ? (
        <LoadingRow label="Loading catalog…" />
      ) : agentProducts.length === 0 ? (
        <EmptyState
          title="Nothing to preview yet"
          description="Add active products with inventory, then come back."
          action={
            <Link to="/merchant/catalog/new" className="btn btn-primary">
              Add product
            </Link>
          }
        />
      ) : (
        <AgentWidget
          className="mx-auto max-h-[32rem] max-w-lg"
          agentName={agent?.display_name ?? 'StyleSelf'}
          greeting={agent?.greeting ?? 'What are you looking for today?'}
          currency={agent?.currency ?? 'USD'}
          storeName={activeStore.name}
          products={agentProducts}
          locations={locations.map((l) => ({ id: l.id, name: l.name }))}
        />
      )}
    </div>
  )
}
