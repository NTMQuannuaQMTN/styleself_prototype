import { supabase } from '../lib/supabase'
import type {
  AgentOrder,
  AgentOrderItem,
  InventoryRow,
  Product,
  ProductVariant,
  Profile,
  Store,
  StoreAgent,
  StoreJoinRequest,
  StoreLocation,
  StoreMember,
  StoreMemberRole,
} from '../lib/database.types'

function unwrap<T>(res: {
  data: T | null
  error: { message: string; code?: string } | null
}): T {
  if (res.error) {
    // ".single()/.maybeSingle() got 0 or >1 rows" — the raw PostgREST text
    // ("Cannot coerce the result to a single JSON object") is opaque to users.
    const m = res.error.message ?? ''
    if (
      res.error.code === 'PGRST116' ||
      /coerce the result to a single json object/i.test(m)
    ) {
      throw new Error('That record was not found, or you don’t have access to it.')
    }
    throw new Error(m || 'Request failed.')
  }
  return res.data as T
}

// ---------------------------------------------------------------------------
// Memberships / onboarding
// ---------------------------------------------------------------------------
export type Membership = {
  role: StoreMemberRole
  location_id: string | null
  store: Store
}

export async function listMyMemberships(userId: string): Promise<Membership[]> {
  const rows = unwrap(
    await supabase
      .from('store_members')
      .select('role, location_id, store:stores(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
  ) as unknown as { role: StoreMemberRole; location_id: string | null; store: Store }[]
  return rows.filter((r) => r.store)
}

export async function listMyJoinRequests(): Promise<
  (StoreJoinRequest & { store: Store | null })[]
> {
  return unwrap(
    await supabase
      .from('store_join_requests')
      .select('*, store:stores(*)')
      .order('created_at', { ascending: false }),
  ) as unknown as (StoreJoinRequest & { store: Store | null })[]
}

export async function createStore(input: {
  name: string
  branchName?: string | null
  headquarters?: string | null
  city?: string | null
  userId: string
}): Promise<Store> {
  return unwrap(
    await supabase
      .from('stores')
      .insert({
        name: input.name.trim(),
        branch_name: input.branchName?.trim() || null,
        headquarters: input.headquarters?.trim() || null,
        city: input.city?.trim() || null,
        created_by: input.userId,
      })
      .select('*')
      .single(),
  )
}

/** Differentiator shown next to a store name: branch name, else address, else city. */
export function storeLabel(store: {
  branch_name?: string | null
  headquarters?: string | null
  city?: string | null
}): string | null {
  const label =
    store.branch_name?.trim() ||
    store.headquarters?.trim() ||
    store.city?.trim() ||
    null

  // Do not show numeric-only branch/address metadata beside the store name.
  return label && !/^\d+$/.test(label) ? label : null
}

export async function searchStores(query: string): Promise<Store[]> {
  const q = query.trim()
  if (!q) return []
  return unwrap(
    await supabase
      .from('stores')
      .select('*')
      .or(`name.ilike.%${q}%,slug.ilike.%${q}%`)
      .order('name')
      .limit(10),
  )
}

export async function requestToJoin(input: {
  storeId: string
  userId: string
  location?: string
  message?: string
}): Promise<StoreJoinRequest> {
  return unwrap(
    await supabase
      .from('store_join_requests')
      .insert({
        store_id: input.storeId,
        user_id: input.userId,
        requester_location: input.location?.trim() || null,
        message: input.message?.trim() || null,
      })
      .select('*')
      .single(),
  )
}

export async function cancelJoinRequest(id: string): Promise<void> {
  const { error } = await supabase
    .from('store_join_requests')
    .update({ status: 'cancelled' })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------------
// Store detail: agent, locations, team
// ---------------------------------------------------------------------------
/** Returns null when the store no longer exists / isn't visible to the user. */
export async function getStore(storeId: string): Promise<Store | null> {
  return unwrap(
    await supabase.from('stores').select('*').eq('id', storeId).maybeSingle(),
  )
}

export async function updateStore(
  storeId: string,
  patch: Partial<
    Pick<
      Store,
      | 'name'
      | 'branch_name'
      | 'headquarters'
      | 'city'
      | 'agent_live'
      | 'slug'
      | 'payout_bank_name'
      | 'payout_account_name'
      | 'payout_account_last4'
    >
  >,
): Promise<Store> {
  return unwrap(
    await supabase
      .from('stores')
      .update(patch)
      .eq('id', storeId)
      .select('*')
      .single(),
  )
}

/** Owner-only: deploy / undeploy the public agent (via a SECURITY DEFINER RPC). */
export async function setStoreLive(storeId: string, live: boolean): Promise<Store> {
  return unwrap(
    await supabase.rpc('set_store_live', { p_store: storeId, p_live: live }),
  ) as Store
}

export async function deleteStore(storeId: string): Promise<void> {
  const { error } = await supabase.from('stores').delete().eq('id', storeId)
  if (error) throw new Error(error.message)
}

/** slugify for the public agent URL — lowercase, hyphenated, no leading/trailing. */
export function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const DEFAULT_AGENT = (storeId: string): StoreAgent => ({
  store_id: storeId,
  display_name: 'StyleSelf',
  greeting: 'What are you looking for today?',
  tone: 'Warm, concise, style-aware',
  currency: 'USD',
  rules: null,
  recommendation_limit: 5,
  brand_description: null,
  category_focus: null,
  require_confirmation: true,
  enabled: false,
  updated_at: new Date().toISOString(),
})

export async function getAgent(storeId: string): Promise<StoreAgent> {
  const existing = unwrap(
    await supabase
      .from('store_agents')
      .select('*')
      .eq('store_id', storeId)
      .maybeSingle(),
  )
  if (existing) return existing
  // Self-heal if the row wasn't seeded (e.g. store made outside the app).
  // Only the owner can insert (RLS) — any error here just falls back to defaults.
  const { data: inserted } = await supabase
    .from('store_agents')
    .insert({ store_id: storeId })
    .select('*')
    .maybeSingle()
  return inserted ?? DEFAULT_AGENT(storeId)
}

export async function updateAgent(
  storeId: string,
  patch: Partial<Omit<StoreAgent, 'store_id' | 'updated_at'>>,
): Promise<StoreAgent> {
  // Upsert so a store whose agent row was never seeded still saves.
  return unwrap(
    await supabase
      .from('store_agents')
      .upsert({ ...patch, store_id: storeId }, { onConflict: 'store_id' })
      .select('*')
      .single(),
  )
}

export async function listLocations(storeId: string): Promise<StoreLocation[]> {
  return unwrap(
    await supabase
      .from('store_locations')
      .select('*')
      .eq('store_id', storeId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true }),
  )
}

export async function createLocation(input: {
  storeId: string
  name: string
  city?: string
  address?: string
}): Promise<StoreLocation> {
  return unwrap(
    await supabase
      .from('store_locations')
      .insert({
        store_id: input.storeId,
        name: input.name.trim(),
        city: input.city?.trim() || null,
        address: input.address?.trim() || null,
      })
      .select('*')
      .single(),
  )
}

export async function updateLocation(
  id: string,
  patch: Partial<Pick<StoreLocation, 'name' | 'city' | 'address' | 'is_primary'>>,
): Promise<void> {
  const { error } = await supabase
    .from('store_locations')
    .update(patch)
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteLocation(id: string): Promise<void> {
  const { error } = await supabase.from('store_locations').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export type TeamMember = StoreMember & {
  profile: Profile | null
  location: StoreLocation | null
}

export async function listMembers(storeId: string): Promise<TeamMember[]> {
  // Two-step (not a PostgREST embed) so it works regardless of how the
  // store_members -> profiles FK is wired. The co-store RLS policy on profiles
  // lets a member read their teammates' rows.
  const members = unwrap(
    await supabase
      .from('store_members')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: true }),
  )
  const ids = [...new Set(members.map((m) => m.user_id))]
  const locationIds = [
    ...new Set(
      members
        .map((m) => m.location_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ]
  const profiles = ids.length
    ? unwrap(await supabase.from('profiles').select('*').in('id', ids))
    : []
  const locations = locationIds.length
    ? unwrap(
        await supabase
          .from('store_locations')
          .select('*')
          .in('id', locationIds),
      )
    : []
  const byId = new Map(profiles.map((p) => [p.id, p]))
  const locationById = new Map(locations.map((location) => [location.id, location]))
  return members.map((m) => ({
    ...m,
    profile: byId.get(m.user_id) ?? null,
    location: m.location_id ? locationById.get(m.location_id) ?? null : null,
  }))
}

export async function listPendingRequests(
  storeId: string,
): Promise<StoreJoinRequest[]> {
  return unwrap(
    await supabase
      .from('store_join_requests')
      .select('*')
      .eq('store_id', storeId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
  )
}

export async function approveJoinRequest(id: string): Promise<void> {
  const { error } = await supabase.rpc('approve_join_request', { p_request: id })
  if (error) throw new Error(error.message)
}

export async function rejectJoinRequest(id: string): Promise<void> {
  const { error } = await supabase.rpc('reject_join_request', { p_request: id })
  if (error) throw new Error(error.message)
}

export async function removeMember(
  storeId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('store_members')
    .delete()
    .eq('store_id', storeId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------
export type ProductWithVariants = Product & {
  variants: (ProductVariant & { inventory: InventoryRow[] })[]
}

export async function listProducts(storeId: string): Promise<ProductWithVariants[]> {
  return unwrap(
    await supabase
      .from('products')
      .select('*, variants:product_variants(*, inventory(*))')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false }),
  ) as unknown as ProductWithVariants[]
}

export async function getProduct(
  id: string,
): Promise<ProductWithVariants | null> {
  return unwrap(
    await supabase
      .from('products')
      .select('*, variants:product_variants(*, inventory(*))')
      .eq('id', id)
      .maybeSingle(),
  ) as unknown as ProductWithVariants | null
}

export type ProductAttributes = {
  description?: string | null
  brand?: string | null
  style?: string | null
  gender?: string | null
  material?: string | null
  care?: string | null
  category?: string | null
}

function cleanAttributes(a: ProductAttributes) {
  const trim = (v: string | null | undefined) =>
    typeof v === 'string' ? v.trim() || null : (v ?? null)
  return {
    description: trim(a.description),
    brand: trim(a.brand),
    style: trim(a.style),
    gender: trim(a.gender),
    material: trim(a.material),
    care: trim(a.care),
    category: trim(a.category),
  }
}

export async function createProduct(
  input: {
    storeId: string
    locationId?: string | null
    merchantSku?: string | null
    name: string
    priceCents: number
    currency: string
    imageUrl?: string
    status?: Product['status']
  } & ProductAttributes,
): Promise<Product> {
  return unwrap(
    await supabase
      .from('products')
      .insert({
        store_id: input.storeId,
        location_id: input.locationId ?? null,
        merchant_sku: input.merchantSku?.trim() || null,
        name: input.name.trim(),
        ...cleanAttributes(input),
        price_cents: input.priceCents,
        currency: input.currency,
        image_url: input.imageUrl?.trim() || null,
        status: input.status ?? 'active',
      })
      .select('*')
      .single(),
  )
}

export async function updateProduct(
  id: string,
  patch: Partial<
    Pick<
      Product,
      | 'name'
      | 'merchant_sku'
      | 'description'
      | 'brand'
      | 'style'
      | 'gender'
      | 'material'
      | 'care'
      | 'category'
      | 'price_cents'
      | 'currency'
      | 'image_url'
      | 'status'
    >
  >,
): Promise<void> {
  const { error } = await supabase.from('products').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function createVariant(input: {
  productId: string
  size?: string | null
  color?: string | null
  sku?: string
  priceCents?: number | null
}): Promise<ProductVariant> {
  return unwrap(
    await supabase
      .from('product_variants')
      .insert({
        product_id: input.productId,
        size: input.size?.trim() || null,
        color: input.color?.trim() || null,
        sku: input.sku?.trim() || null,
        price_cents: input.priceCents ?? null,
      })
      .select('*')
      .single(),
  )
}

export async function updateVariant(
  id: string,
  patch: Partial<Pick<ProductVariant, 'size' | 'color' | 'sku' | 'price_cents'>>,
): Promise<void> {
  const { error } = await supabase
    .from('product_variants')
    .update(patch)
    .eq('id', id)
  if (error) throw new Error(error.message)
}

/** Human label for a (size, color) variant: "M · Navy", "One size", "Charcoal". */
export function variantLabel(v: {
  size?: string | null
  color?: string | null
}): string {
  return [v.size, v.color].filter(Boolean).join(' · ') || 'Default'
}

export async function deleteVariant(id: string): Promise<void> {
  const { error } = await supabase
    .from('product_variants')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function setInventory(
  variantId: string,
  locationId: string,
  quantity: number,
): Promise<void> {
  const { error } = await supabase
    .from('inventory')
    .upsert(
      { variant_id: variantId, location_id: locationId, quantity },
      { onConflict: 'variant_id,location_id' },
    )
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export type DashboardCounts = {
  products: number
  activeProducts: number
  locations: number
  members: number
  pendingRequests: number
  totalUnits: number
}

export async function getDashboardCounts(
  storeId: string,
): Promise<DashboardCounts> {
  const [products, locations, members, pending] = await Promise.all([
    listProducts(storeId),
    listLocations(storeId),
    supabase
      .from('store_members')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId),
    supabase
      .from('store_join_requests')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('status', 'pending'),
  ])

  if (members.error) throw new Error(members.error.message)
  if (pending.error) throw new Error(pending.error.message)

  const totalUnits = products.reduce(
    (sum, p) =>
      sum +
      p.variants.reduce(
        (vs, v) => vs + v.inventory.reduce((is, i) => is + i.quantity, 0),
        0,
      ),
    0,
  )

  return {
    products: products.length,
    activeProducts: products.filter((p) => p.status === 'active').length,
    locations: locations.length,
    members: members.count ?? 0,
    pendingRequests: pending.count ?? 0,
    totalUnits,
  }
}

// ---------------------------------------------------------------------------
// Orders — agent checkout sales (readable by any store member via RLS)
// ---------------------------------------------------------------------------
export type OrderWithItems = AgentOrder & { agent_order_items: AgentOrderItem[] }

export async function listOrders(storeId: string): Promise<OrderWithItems[]> {
  return unwrap(
    await supabase
      .from('agent_orders')
      .select('*, agent_order_items(*)')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(100),
  ) as unknown as OrderWithItems[]
}
