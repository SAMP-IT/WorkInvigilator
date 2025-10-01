import { createClient } from '@supabase/supabase-js'

// Get Supabase client with proper initialization
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // During build time or if env vars are missing, throw an error that will be caught
    throw new Error('Supabase environment variables are not configured')
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

// Export a getter that creates the client lazily
let cachedClient: ReturnType<typeof getSupabaseClient> | null = null

export const supabase = new Proxy({} as ReturnType<typeof getSupabaseClient>, {
  get(target, prop) {
    if (!cachedClient) {
      try {
        cachedClient = getSupabaseClient()
      } catch (error) {
        // During build time, return a mock that won't be actually called
        console.warn('Supabase client not initialized:', error)
        return undefined
      }
    }
    return cachedClient[prop as keyof ReturnType<typeof getSupabaseClient>]
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