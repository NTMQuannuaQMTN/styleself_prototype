import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Profile } from '../lib/database.types'
import {
  AuthContext,
  type AuthContextValue,
  // type MerchantSetup,
  type SignUpArgs,
} from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const mounted = useRef(true)

  const fetchProfile = useCallback(
    async (userId: string, { retry = false }: { retry?: boolean } = {}) => {
      setProfileLoading(true)
      try {
        const maxAttempts = retry ? 5 : 1
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle()

          if (error) {
            console.error('Could not load profile:', error.message)
            break
          }
          if (data) {
            if (mounted.current) setProfile(data)
            return data
          }
          // The profile is inserted by a DB trigger and can lag a signup by a beat.
          await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)))
        }
        return null
      } finally {
        if (mounted.current) setProfileLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    mounted.current = true

    if (!isSupabaseConfigured) {
      return () => {
        mounted.current = false
      }
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!mounted.current) return
      setSession(next)

      if (event === 'INITIAL_SESSION') {
        setLoading(false)
        if (next?.user) void fetchProfile(next.user.id)
        return
      }
      if (event === 'SIGNED_IN' && next?.user) {
        void fetchProfile(next.user.id, { retry: true })
        return
      }
      if (event === 'SIGNED_OUT') {
        setProfile(null)
      }
    })

    return () => {
      mounted.current = false
      sub.subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    },
    [],
  )

  const signUpWithPassword = useCallback(
    async ({ email, password, fullName }: SignUpArgs) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error

      // Supabase returns a user with no identities when the email already exists.
      const alreadyRegistered =
        !!data.user && (data.user.identities?.length ?? 0) === 0

      return {
        needsEmailConfirmation: !data.session && !alreadyRegistered,
        alreadyRegistered,
      }
    },
    [],
  )

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' },
      },
    })
    if (error) throw error
  }, [])

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    if (mounted.current) setProfile(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return null
    return fetchProfile(session.user.id)
  }, [session, fetchProfile])

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      profile,
      profileLoading,
      signInWithPassword,
      signUpWithPassword,
      signInWithGoogle,
      sendPasswordReset,
      updatePassword,
      signOut,
      refreshProfile,
    }),
    [
      loading,
      session,
      profile,
      profileLoading,
      signInWithPassword,
      signUpWithPassword,
      signInWithGoogle,
      sendPasswordReset,
      updatePassword,
      signOut,
      refreshProfile,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
