/**
 * Minimal hand-written types for the tables the app touches today. When more of
 * the schema lands, replace this with `supabase gen types typescript`.
 *
 * These are `type` aliases (not interfaces) on purpose — the Supabase client
 * only recognises a schema whose members structurally match `Record<string,
 * unknown>`, which interfaces don't satisfy.
 */
export type UserRole = 'merchant' | 'customer'
export type MerchantSetupType = 'branch' | 'create-store'

export type Profile = {
  id: string
  email: string | null
  full_name: string | null
  role: UserRole
  merchant_setup: MerchantSetupType | null
  created_at: string
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Omit<Profile, 'id'>> & { id: string }
        Update: Partial<Profile>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      set_signup_role: {
        Args: { desired: UserRole }
        Returns: UserRole
      }
      set_merchant_setup: {
        Args: { desired: MerchantSetupType }
        Returns: MerchantSetupType
      }
    }
    Enums: {
      user_role: UserRole
      merchant_setup_type: MerchantSetupType
    }
    CompositeTypes: Record<string, never>
  }
}
