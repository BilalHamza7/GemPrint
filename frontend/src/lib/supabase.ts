import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = url && key ? createClient(url, key) : null

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!supabase) throw new Error('Supabase frontend configuration is missing.')
  const { data } = await supabase.auth.getSession()
  if (!data.session?.access_token) throw new Error('Your session has expired. Please sign in again.')
  const isFormData = init.body instanceof FormData
  const response = await fetch(`${import.meta.env.VITE_API_URL}${path}`, { ...init, headers: { ...(isFormData ? {} : { 'Content-Type': 'application/json' }), Authorization: `Bearer ${data.session.access_token}`, ...init.headers } })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error ?? 'Request failed.')
  return body as T
}
