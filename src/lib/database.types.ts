/**
 * Hand-written types for the tables the app touches. When the schema settles,
 * replace this with `supabase gen types typescript`.
 *
 * These are `type` aliases (not interfaces) on purpose — the Supabase client
 * only recognises a schema whose members structurally match `Record<string,
 * unknown>`, which interfaces don't satisfy.
 */
/** Team role within a store — unrelated to platform access (all users are merchants). */
export type StoreMemberRole = 'owner' | 'admin' | 'member'
export type JoinRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'
export type ProductStatus = 'active' | 'draft' | 'archived'

export type Profile = {
  id: string
  email: string | null
  full_name: string | null
  created_at: string
  updated_at: string
}

export type Store = {
  id: string
  name: string
  slug: string
  branch_name: string | null
  /** street address */
  headquarters: string | null
  /** city / area */
  city: string | null
  agent_live: boolean
  /** Token carried in the iframe embed URL (?k=). Registration, not a secret. */
  embed_key: string
  /** Payout destination for completed orders (settlement is simulated). */
  payout_bank_name: string | null
  payout_account_name: string | null
  payout_account_last4: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type StoreMember = {
  store_id: string
  user_id: string
  location_id: string | null
  role: StoreMemberRole
  created_at: string
}

export type StoreAgent = {
  store_id: string
  display_name: string
  greeting: string
  tone: string
  currency: string
  rules: string | null
  recommendation_limit: number
  brand_description: string | null
  category_focus: string | null
  require_confirmation: boolean
  enabled: boolean
  updated_at: string
}

export type AgentOrder = {
  id: string
  store_id: string
  conversation_id: string
  draft_hash: string
  buyer_name: string | null
  buyer_email: string | null
  currency: string
  subtotal_cents: number
  fees_cents: number
  total_cents: number
  fulfillment: string
  location_id: string | null
  status: string
  visa_auth_code: string | null
  created_at: string
}

export type AgentOrderItem = {
  id: string
  order_id: string
  product_id: string | null
  variant_id: string | null
  name: string
  variant_label: string | null
  quantity: number
  unit_price_cents: number
  line_total_cents: number
}

export type StoreLocation = {
  id: string
  store_id: string
  name: string
  address: string | null
  city: string | null
  is_primary: boolean
  created_at: string
}

export type StoreJoinRequest = {
  id: string
  store_id: string
  user_id: string
  status: JoinRequestStatus
  message: string | null
  requester_location: string | null
  requester_name: string | null
  requester_email: string | null
  created_at: string
  decided_at: string | null
  decided_by: string | null
}

export type Product = {
  id: string
  store_id: string
  location_id: string | null
  /** Merchant-assigned product code, unique within a store. CSV import key. */
  merchant_sku: string | null
  name: string
  description: string | null
  brand: string | null
  style: string | null
  gender: string | null
  material: string | null
  care: string | null
  category: string | null
  price_cents: number
  currency: string
  image_url: string | null
  status: ProductStatus
  created_at: string
  updated_at: string
}

/** One (size, color/pattern) combination of a product. */
export type ProductVariant = {
  id: string
  product_id: string
  size: string | null
  color: string | null
  sku: string | null
  price_cents: number | null
  created_at: string
}

export type InventoryRow = {
  variant_id: string
  location_id: string
  quantity: number
}

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, Partial<Omit<Profile, 'id'>> & { id: string }>
      stores: Table<
        Store,
        {
          name: string
          branch_name?: string | null
          headquarters?: string | null
          city?: string | null
          created_by: string
        }
      >
      store_members: Table<StoreMember>
      store_agents: Table<StoreAgent, { store_id: string } & Partial<StoreAgent>>
      store_locations: Table<
        StoreLocation,
        {
          store_id: string
          name: string
          address?: string | null
          city?: string | null
          is_primary?: boolean
        }
      >
      store_join_requests: Table<
        StoreJoinRequest,
        {
          store_id: string
          user_id: string
          message?: string | null
          requester_location?: string | null
        }
      >
      products: Table<
        Product,
        {
          store_id: string
          location_id?: string | null
          merchant_sku?: string | null
          name: string
          description?: string | null
          brand?: string | null
          style?: string | null
          gender?: string | null
          material?: string | null
          care?: string | null
          category?: string | null
          price_cents?: number
          currency?: string
          image_url?: string | null
          status?: ProductStatus
        }
      >
      product_variants: Table<
        ProductVariant,
        {
          product_id: string
          size?: string | null
          color?: string | null
          sku?: string | null
          price_cents?: number | null
        }
      >
      inventory: Table<
        InventoryRow,
        { variant_id: string; location_id: string; quantity?: number }
      >
      agent_orders: Table<AgentOrder>
      agent_order_items: Table<AgentOrderItem>
    }
    Views: Record<string, never>
    Functions: {
      approve_join_request: { Args: { p_request: string }; Returns: undefined }
      reject_join_request: { Args: { p_request: string }; Returns: undefined }
      agent_checkout: {
        Args: {
          p_store: string
          p_conversation: string
          p_draft_hash: string
          p_buyer_name: string | null
          p_buyer_email: string | null
          p_fulfillment: string
          p_location: string | null
          p_currency: string
          p_items: unknown
        }
        Returns: AgentOrder
      }
      set_store_live: {
        Args: { p_store: string; p_live: boolean }
        Returns: Store
      }
      rotate_embed_key: {
        Args: { p_store: string }
        Returns: Store
      }
    }
    Enums: {
      store_member_role: StoreMemberRole
      join_request_status: JoinRequestStatus
      product_status: ProductStatus
    }
    CompositeTypes: Record<string, never>
  }
}
