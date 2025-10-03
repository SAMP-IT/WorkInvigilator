import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Create client singleton - will be initialized on first access
let supabaseInstance: SupabaseClient | null = null

function getSupabaseClient() {
  if (supabaseInstance) {
    return supabaseInstance
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase credentials missing!')
    throw new Error('Supabase environment variables are not configured')
  }

  console.log('🔧 Initializing Supabase client...')

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'work-invigilator-auth',
    },
    global: {
      headers: {
        'x-client-info': 'work-invigilator-dashboard',
      },
    },
  })

  console.log('✅ Supabase client initialized')
  return supabaseInstance
}

// Create a proxy that lazily initializes on access
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    const client = getSupabaseClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (client as any)[prop]
    return typeof value === 'function' ? value.bind(client) : value
  }
})

// Database types (can be generated from Supabase CLI)
export interface Profile {
  id: string
  email: string
  role: 'admin' | 'user'
  created_at: string
  updated_at: string
  organization_id?: string
  organizations?: {
    id: string
    name: string
  }
}

export interface Recording {
  id: string
  user_id: string
  filename: string
  file_url: string | null
  duration: number
  durationFormatted?: string
  file_size?: number | null
  created_at: string
  session_id?: string
  type?: string
  employeeName?: string
  timestamp?: string
  totalDuration?: number
  session_info?: {
    session_start_time: string
    total_chunks: number
    total_duration_seconds: number
    chunks: Array<{
      id: string
      chunk_number: number
      duration_seconds: number
      chunk_start_time: string
      file_url: string
      filename: string
    }>
  }
}

export interface Screenshot {
  id: string
  user_id: string
  filename: string
  file_url: string
  created_at: string
  session_id?: string
}

export interface Session {
  id: string
  user_id: string
  session_start_time: string
  session_end_time?: string
  total_duration_seconds?: number
  total_chunks?: number
  total_chunk_duration_seconds?: number
  chunk_files?: { filename: string; file_url: string }[]
  created_at: string
}