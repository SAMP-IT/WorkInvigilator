'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'user';
}

// Timeout helper
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    ),
  ])
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true

    // Set maximum timeout for auth check - MUST finish quickly
    const authTimeout = setTimeout(() => {
      if (mounted) {
        setError('Authentication check timed out. Please refresh the page.')
        setIsLoading(false)
      }
    }, 3000) // 3 second max - fail fast

    const checkAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await withTimeout(
          supabase.auth.getSession(),
          2000 // 2 second timeout
        )

        if (!mounted) return

        if (sessionError) {
          throw sessionError
        }

        if (!session) {
          clearTimeout(authTimeout)
          if (mounted) {
            // Use window.location for reliable redirect
            window.location.href = '/login'
          }
          return
        }

        // Get user profile to check role with timeout
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (!mounted) return

        const role = profile?.role || 'user'

        // Check if user has required role
        if (requiredRole && role !== requiredRole && role !== 'admin') {
          clearTimeout(authTimeout)
          if (mounted) {
            window.location.href = '/unauthorized'
          }
          return
        }

        setIsAuthenticated(true)
        clearTimeout(authTimeout)
      } catch (error) {
        clearTimeout(authTimeout)

        if (!mounted) return

        // Check if it's a timeout error
        if (error instanceof Error && error.message.includes('timeout')) {
          setError('Authentication timed out. Please refresh the page.')
          // Don't redirect on timeout, allow retry
        } else {
          window.location.href = '/login'
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    checkAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (event === 'SIGNED_OUT' || !session) {
        window.location.href = '/login'
      }
    })

    return () => {
      mounted = false
      clearTimeout(authTimeout)
      subscription.unsubscribe()
    }
  }, [router, requiredRole])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">W</span>
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-ink-hi">Work Invigilator</h1>
              <p className="text-ink-muted text-sm">Loading...</p>
            </div>
          </div>
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          {error && (
            <div className="mt-4 text-red-400 text-sm">
              {error}
              <button
                onClick={() => window.location.reload()}
                className="ml-2 underline hover:text-red-300"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">!</span>
            </div>
          </div>
          <h2 className="text-xl font-bold text-ink-hi mb-2">Authentication Error</h2>
          <p className="text-ink-muted mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Show loading during redirect instead of null (blank screen)
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">W</span>
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-ink-hi">Work Invigilator</h1>
              <p className="text-ink-muted text-sm">Redirecting to login...</p>
            </div>
          </div>
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}