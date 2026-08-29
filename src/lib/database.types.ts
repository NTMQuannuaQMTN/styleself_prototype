/**
 * Minimal hand-written types for the tables the app touches today. When more of
 * the schema lands, replace this with `supabase gen types typescript`.
 *
 * These are `type` aliases (not interfaces) on purpose — the Supabase client
 * only recognises a schema whose members structurally match `Record<string,
 * unknown>`, which interfaces don't satisfy.
 */
export type UserRole = 'merchant' | 'customer'

export type Profile = {
  id: string
  email: string | null
  full_name: string | null
  role: UserRole
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
    }
    Enums: {
      user_role: UserRole
    }
    CompositeTypes: Record<string, never>
  }
}
