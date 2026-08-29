import { useStore } from '../../merchant/useStore'
import { useAsync } from '../../merchant/useAsync'
import { listOrders, type OrderWithItems } from '../../merchant/api'
import { formatMoney } from '../../merchant/money'
import {
  Card,
  EmptyState,
  InlineError,
  LoadingRow,
  PageHeader,
} from '../../components/merchant/ui'

export default function OrdersPage() {
  const { activeStore, locations } = useStore()
  const orders = useAsync(() => listOrders(activeStore!.id), [activeStore?.id])

  if (!activeStore) return null

  const locName = (id: string | null) =>
    id ? (locations.find((l) => l.id === id)?.name ?? null) : null

  const totalPaid = (orders.data ?? []).reduce((s, o) => s + o.total_cents, 0)

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Orders"
        title="Agent sales"
        description="Every order a customer completed through the deployed agent. Payment is settled to the store's payout account."
      />

      {orders.error ? <InlineError>{orders.error}</InlineError> : null}

      {orders.loading ? (
        <LoadingRow label="Loading orders…" />
      ) : (orders.data ?? []).length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="When a shopper checks out through the agent, the order shows up here."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <p className="eyebrow text-[0.58rem]">Orders</p>
              <p className="mt-1 font-display text-2xl text-ink">
                {orders.data!.length}
              </p>
            </Card>
            <Card>
              <p className="eyebrow text-[0.58rem]">Gross paid</p>
              <p className="mt-1 font-display text-2xl text-ink">
                {formatMoney(totalPaid, orders.data![0]?.currency ?? 'USD')}
              </p>
            </Card>
            <Card>
              <p className="eyebrow text-[0.58rem]">Payout to</p>
              <p className="mt-1 text-sm text-ink">
                {activeStore.payout_account_last4
                  ? `${activeStore.payout_bank_name ?? 'Bank'} ••${activeStore.payout_account_last4}`
                  : 'Not set'}
              </p>
            </Card>
          </div>

          <div className="space-y-3">
            {orders.data!.map((o) => (
              <OrderRow key={o.id} order={o} locationName={locName(o.location_id)} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function OrderRow({
  order,
  locationName,
}: {
  order: OrderWithItems
  locationName: string | null
}) {
  const money = (c: number) => formatMoney(c, order.currency)
  const when = new Date(order.created_at).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <p className="text-sm font-medium text-ink">
            {order.buyer_name || 'Guest'}
          </p>
          <p className="text-xs text-muted">{when}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-lg text-ink">{money(order.total_cents)}</p>
          <p className="text-[0.68rem] text-muted">
            {order.fulfillment === 'pickup'
              ? `Pickup${locationName ? ` · ${locationName}` : ''}`
              : 'Delivery'}
          </p>
        </div>
      </div>

      <ul className="space-y-1 border-t border-line pt-2.5 text-sm">
        {order.agent_order_items.map((it) => (
          <li key={it.id} className="flex justify-between gap-3">
            <span className="text-ink">
              {it.name}
              {it.variant_label ? (
                <span className="text-muted"> · {it.variant_label}</span>
              ) : null}
              {it.quantity > 1 ? (
                <span className="text-muted"> × {it.quantity}</span>
              ) : null}
            </span>
            <span className="shrink-0 text-muted">{money(it.line_total_cents)}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-2.5 text-[0.7rem] text-muted">
        <span>
          Subtotal {money(order.subtotal_cents)}
          {order.fees_cents > 0 ? ` · Delivery ${money(order.fees_cents)}` : ''}
        </span>
        {order.visa_auth_code ? (
          <span className="font-mono">Visa {order.visa_auth_code}</span>
        ) : null}
        <span className="rounded bg-success/10 px-1.5 text-success">{order.status}</span>
      </div>
    </Card>
  )
}
