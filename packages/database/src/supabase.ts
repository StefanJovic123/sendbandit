import { createClient, SupabaseClient } from '@supabase/supabase-js'

export type { SupabaseClient }

// Create Supabase client for edge environments
export function createSupabaseClient(supabaseUrl: string, supabaseKey: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

// Helper to create client from env
export function createSupabaseFromEnv(env: {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
}): SupabaseClient {
  return createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
}
