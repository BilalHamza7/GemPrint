import { createClient } from '@supabase/supabase-js'
import { env, supabaseConfigured } from './env.js'

function config() {
  if (!supabaseConfigured) throw new Error('Supabase is not configured.')
  return { url: env.SUPABASE_URL!, serviceRole: env.SUPABASE_SERVICE_ROLE_KEY! }
}

export function getSupabaseAdminClient() {
  const { url, serviceRole } = config()
  return createClient(url, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } })
}
