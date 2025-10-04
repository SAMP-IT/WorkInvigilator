'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Profile } from './supabase'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: Error }>
  signOut: () => Promise<void>
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Timeout helper with better error handling
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage = 'Request timeout'): Promise<T> {
  let timeoutHandle: NodeJS.Timeout

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      const error = new Error(errorMessage)
      error.name = 'TimeoutError'
      reject(error)
    }, timeoutMs)
  })

  return Promise.race([
    promise.then((result) => {
      clearTimeout(timeoutHandle)
      return result
    }).catch((error) => {
      clearTimeout(timeoutHandle)
      throw error
    }),
    timeoutPromise
  ])
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // Set a maximum time for initialization - MUST finish within 3 seconds
    const initTimeout = setTimeout(() => {
      if (mounted) {
        setLoading(false)
      }
    }, 3000) // 3 second max - faster timeout

    // Get initial session with timeout
    const initializeAuth = async () => {
      try {
        // Quick session check - fail fast
        const { data: { session }, error } = await withTimeout(
          supabase.auth.getSession(),
          2000 // 2 second timeout
        )

        if (!mounted) return

        if (error) {
          setLoading(false)
          clearTimeout(initTimeout)
          return
        }

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          // Load profile but don't block - allow UI to render
          loadUserProfile(session.user.id).finally(() => {
            if (mounted) {
              clearTimeout(initTimeout)
            }
          })
        } else {
          setLoading(false)
          clearTimeout(initTimeout)
        }
      } catch (error) {
        if (mounted) {
          setLoading(false)
          clearTimeout(initTimeout)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        await loadUserProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      clearTimeout(initTimeout)
      subscription.unsubscribe()
    }
  }, [])

  async function loadUserProfile(userId: string, retryCount = 0) {
    const MAX_RETRIES = 1 // Only 1 retry - fail faster
    const RETRY_DELAY = 500 // Faster retry

    try {
      const profileResult = await supabase
        .from('profiles')
        .select('*, organizations(id, name)')
        .eq('id', userId)
        .single()

      const { data: profile, error } = profileResult

      if (error) {
        // If profile doesn't exist, create a default one for this user
        if (error.code === 'PGRST116') { // No rows returned
          try {
            const { data: user } = await withTimeout(
              supabase.auth.getUser(),
              3000
            )

            if (user.user) {
              // Get or create default organization
              const { data: defaultOrg } = await supabase
                .from('organizations')
                .select('id')
                .eq('name', 'Default Organization')
                .single()

              const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert([{
                  id: userId,
                  email: user.user.email,
                  role: 'admin', // Default to admin for manual signups
                  organization_id: defaultOrg?.id || null
                }])
                .select('*, organizations(id, name)')
                .single()

              if (createError) {
                setProfile(null)
              } else {
                setProfile(newProfile)
              }
            }
          } catch (createError) {
            setProfile(null)
          }
        } else if (retryCount < MAX_RETRIES && error.message.includes('timeout')) {
          // Retry on timeout
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
          return loadUserProfile(userId, retryCount + 1)
        } else {
          setProfile(null)
        }
      } else {
        setProfile(profile)
      }
    } catch (error) {
      // Retry on network errors
      if (retryCount < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
        return loadUserProfile(userId, retryCount + 1)
      }

      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  async function signIn(email: string, password: string) {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setLoading(false)
      return { error }
    }

    // Don't set loading false here - let the auth state change handler do it
    // after the profile is loaded
    return { data }
  }

  async function signOut() {
    setLoading(true)
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
    setLoading(false)
  }

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signOut,
    isAdmin: profile?.role === 'admin'
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}