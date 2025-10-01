import { createClient } from '@supabase/supabase-js'

// Get admin Supabase client with proper initialization
function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase admin environment variables are not configured')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Export a getter that creates the admin client lazily
let cachedAdminClient: ReturnType<typeof getSupabaseAdminClient> | null = null

export const supabaseAdmin = new Proxy({} as ReturnType<typeof getSupabaseAdminClient>, {
  get(target, prop) {
    if (!cachedAdminClient) {
      try {
        cachedAdminClient = getSupabaseAdminClient()
      } catch (error) {
        console.warn('Supabase admin client not initialized:', error)
        return undefined
      }
    }
    return cachedAdminClient[prop as keyof ReturnType<typeof getSupabaseAdminClient>]
  }
})

// For backwards compatibility, also export with direct values if env vars not available
export const createAdminClient = () => {
  const url = "https://qqnmilkgltcooqzytkxy.supabase.co"
  // We'll need the service role key from environment or hardcode temporarily
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
    // This would need to be the actual service role key from Supabase dashboard
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbm1pbGtnbHRjb29xenl0a3h5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwNjM4NywiZXhwIjoyMDc0MTgyMzg3fQ.SERVICE_ROLE_KEY_PLACEHOLDER"

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}