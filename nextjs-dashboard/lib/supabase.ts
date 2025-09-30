import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
  file_url: string
  duration: number
  file_size?: number
  created_at: string
  session_id?: string
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
  chunk_files?: any
  created_at: string
}