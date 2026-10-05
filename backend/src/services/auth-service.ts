import { getSupabaseAuthClient } from '../config/supabase.js'
import type { Credentials } from '../models/auth.js'

export class AuthService {
  register(credentials: Credentials) {
    return getSupabaseAuthClient().auth.signUp({ email: credentials.email, password: credentials.password, options: { data: credentials.fullName ? { full_name: credentials.fullName } : undefined } })
  }
  login(credentials: Credentials) {
    return getSupabaseAuthClient().auth.signInWithPassword({ email: credentials.email, password: credentials.password })
  }
}
