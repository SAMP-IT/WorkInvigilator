import { createClient } from '@supabase/supabase-js'

// Server-side admin client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create admin client for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
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