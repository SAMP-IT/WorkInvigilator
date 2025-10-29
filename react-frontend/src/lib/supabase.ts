import { createClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';
import { config } from './config';

const supabaseUrl = config.supabase.url;
const supabaseAnonKey = config.supabase.anonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'work-invigilator-auth',
    storage: window.localStorage,
  },
  global: {
    headers: {
      'x-client-info': 'work-invigilator-react-dashboard',
    },
  },
});

export type { User };

// Database types
export interface Profile {
  id: string;
  email: string;
  name?: string;
  department?: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
  organization_id?: string;
  organizations?: {
    id: string;
    name: string;
  };
}

export interface Recording {
  id: string;
  user_id: string;
  filename: string;
  file_url: string | null;
  duration: number;
  durationFormatted?: string;
  file_size?: number | null;
  created_at: string;
  session_id?: string;
  type?: string;
  employeeName?: string;
  timestamp?: string;
  totalDuration?: number;
  session_info?: {
    session_start_time: string;
    total_chunks: number;
    total_duration_seconds: number;
    chunks: Array<{
      id: string;
      chunk_number: number;
      duration_seconds: number;
      chunk_start_time: string;
      file_url: string;
      filename: string;
    }>;
  };
}

export interface Screenshot {
  id: string;
  user_id: string;
  filename: string;
  file_url: string;
  created_at: string;
  session_id?: string;
}

export interface Session {
  id: string;
  user_id: string;
  session_start_time: string;
  session_end_time?: string;
  total_duration_seconds?: number;
  total_chunks?: number;
  total_chunk_duration_seconds?: number;
  chunk_files?: { filename: string; file_url: string }[];
  created_at: string;
}

// Auth helper functions
export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getUserProfile(userId: string): Promise<Profile | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, organizations(*)')
    .eq('id', userId)
    .single();

  return profile;
}

export async function getOrganizationForUser(userId: string): Promise<string | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', userId)
    .single();

  return profile?.organization_id || null;
}

export async function signOut() {
  await supabase.auth.signOut();
}
