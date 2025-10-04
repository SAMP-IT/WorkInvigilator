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
        console.log('[AuthContext] Init timeout reached')
        setLoading(false)
      }
    }, 3000) // 3 second max - faster timeout

    // Get initial session with timeout
    const initializeAuth = async () => {
      try {
        console.log('[AuthContext] Initializing auth, getting session...')
        // Don't wrap getSession in timeout - Supabase handles this internally
        const { data: { session }, error } = await supabase.auth.getSession()

        if (!mounted) return

        if (error) {
          console.log('[AuthContext] Session error:', error.message)
          setLoading(false)
          clearTimeout(initTimeout)
          return
        }

        console.log('[AuthContext] Session retrieved:', session ? 'User logged in' : 'No session')
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          console.log('[AuthContext] Loading user profile for:', session.user.id)
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
        console.error('[AuthContext] Init error:', error)
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
      console.log('[AuthContext] Auth state changed:', event, session ? 'User logged in' : 'No session')
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
      console.log('[AuthContext] Loading profile for user:', userId, 'Retry:', retryCount)
      const profileResult = await supabase
        .from('profiles')
        .select('*, organizations(id, name)')
        .eq('id', userId)
        .single()

      const { data: profile, error } = profileResult

      if (error) {
        console.log('[AuthContext] Profile load error:', error.message, error.code)
        // If profile doesn't exist, create a default one for this user
        if (error.code === 'PGRST116') { // No rows returned
          try {
            const { data: user } = await supabase.auth.getUser()

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
                console.log('[AuthContext] Failed to create profile:', createError.message)
                setProfile(null)
              } else {
                console.log('[AuthContext] Created new profile:', newProfile)
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
          console.log('[AuthContext] Profile error (non-retryable):', error.message)
          setProfile(null)
        }
      } else {
        console.log('[AuthContext] Profile loaded successfully:', profile)
        setProfile(profile)
      }
    } catch (error) {
      console.error('[AuthContext] Unexpected error loading profile:', error)
      // Retry on network errors
      if (retryCount < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
        return loadUserProfile(userId, retryCount + 1)
      }

      setProfile(null)
    } finally {
      console.log('[AuthContext] Profile loading complete, setting loading to false')
      setLoading(false)
    }
  }

  async function signIn(email: string, password: string) {
    console.log('[AuthContext] Sign in called for:', email)
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.log('[AuthContext] Sign in failed:', error.message)
      setLoading(false)
      return { error }
    }

    console.log('[AuthContext] Sign in successful, waiting for auth state change')
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