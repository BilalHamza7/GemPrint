import { createClient } from '@supabase/supabase-js'
import { env, supabaseConfigured } from './env.js'

function config() {
  if (!supabaseConfigured) throw new Error('Supabase is not configured.')
  return { url: env.SUPABASE_URL!, anon: env.SUPABASE_ANON_KEY!, serviceRole: env.SUPABASE_SERVICE_ROLE_KEY! }
}

export function getSupabaseAuthClient() {
  const { url, anon } = config()
  return createClient(url, anon, { auth: { autoRefreshToken: false, persistSession: false } })
}

export function getSupabaseAdminClient() {
  const { url, serviceRole } = config()
  return createClient(url, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } })
}
