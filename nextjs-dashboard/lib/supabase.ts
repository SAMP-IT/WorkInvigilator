import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: typeof window !== 'undefined',
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'work-invigilator-auth',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  global: {
    headers: {
      'x-client-info': 'work-invigilator-dashboard',
    },
  },
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