import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** False until VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set in .env.local. */
export const isSupabaseConfigured = Boolean(url && anonKey)

const MISSING =
  'Supabase is not configured. Copy .env.example to .env.local and set ' +
  'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (Project Settings → API), then restart the dev server.'

/**
 * The client is always exported so imports don't crash the app (the landing
 * page has to render without credentials). If it isn't configured, any actual
 * use throws a clear error and the auth screens show a setup notice instead.
 */
export const supabase: SupabaseClient<Database> = isSupabaseConfigured
  ? createClient<Database>(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : (new Proxy(
      {},
      {
        get() {
          throw new Error(MISSING)
        },
      },
    ) as SupabaseClient<Database>)
