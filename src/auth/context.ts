import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { Profile } from '../lib/database.types'

export type MerchantSetup = 'branch' | 'create-store'

export type SignUpArgs = {
  email: string
  password: string
  fullName: string
}

export type SignUpResult = {
  needsEmailConfirmation: boolean
  alreadyRegistered: boolean
}

export interface AuthContextValue {
  /** True until the initial session has been resolved. */
  loading: boolean
  session: Session | null
  user: User | null
  profile: Profile | null
  /** True while the profile row is being (re)fetched. */
  profileLoading: boolean
  signInWithPassword: (email: string, password: string) => Promise<void>
  signUpWithPassword: (args: SignUpArgs) => Promise<SignUpResult>
  signInWithGoogle: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  /** Update the profiles row (upserts if it's somehow missing). */
  updateProfile: (patch: { full_name?: string }) => Promise<void>
  /** Change the account email — Supabase sends a confirmation link. */
  updateEmail: (email: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<Profile | null>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
