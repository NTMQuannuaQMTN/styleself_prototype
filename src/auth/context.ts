import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { Profile, UserRole } from '../lib/database.types'

export type SignUpArgs = {
  email: string
  password: string
  fullName: string
  role: UserRole
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
  signInWithGoogle: (role?: UserRole) => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<Profile | null>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export const PENDING_ROLE_KEY = 'styleself:pending-role'
