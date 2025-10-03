import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Create admin client singleton
let supabaseAdminInstance: SupabaseClient | null = null

function getSupabaseAdminClient() {
  if (supabaseAdminInstance) {
    return supabaseAdminInstance
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Supabase admin credentials missing!')
    throw new Error('Supabase admin environment variables are not configured')
  }

  console.log('🔧 Initializing Supabase Admin client...')

  supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'x-client-info': 'work-invigilator-admin',
      },
    },
  })

  console.log('✅ Supabase Admin client initialized')
  return supabaseAdminInstance
}

// Create a proxy that lazily initializes on access
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    const client = getSupabaseAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (client as any)[prop]
    return typeof value === 'function' ? value.bind(client) : value
  }
})