import { Router } from 'express'
import { getSupabaseAuthClient } from '../config/supabase.js'
import { requireAuth } from '../middleware/require-auth.js'

type Credentials = { email: string; password: string; fullName?: string }
function validateCredentials(body: unknown, includeName: boolean): Credentials | null {
  if (!body || typeof body !== 'object') return null
  const { email, password, fullName } = body as Record<string, unknown>
  if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email) || typeof password !== 'string' || password.length < 8 || password.length > 128) return null
  if (includeName && fullName !== undefined && (typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.length > 120)) return null
  return { email: email.trim(), password, ...(typeof fullName === 'string' ? { fullName: fullName.trim() } : {}) }
}
export const authRouter = Router()
authRouter.post('/register', async (request, response) => {
  const parsed = validateCredentials(request.body, true)
  if (!parsed) return response.status(400).json({ error: 'Invalid registration data.' })
  try {
    const { email, password, fullName } = parsed
    const { data, error } = await getSupabaseAuthClient().auth.signUp({ email, password, options: { data: fullName ? { full_name: fullName } : undefined } })
    return error ? response.status(400).json({ error: error.message }) : response.status(201).json({ user: data.user, session: data.session })
  } catch { return response.status(503).json({ error: 'Authentication service is not configured.' }) }
})
authRouter.post('/login', async (request, response) => {
  const parsed = validateCredentials(request.body, false)
  if (!parsed) return response.status(400).json({ error: 'Invalid login data.' })
  try {
    const { data, error } = await getSupabaseAuthClient().auth.signInWithPassword({ email: parsed.email, password: parsed.password })
    return error ? response.status(401).json({ error: 'Invalid email or password.' }) : response.json({ user: data.user, session: data.session })
  } catch { return response.status(503).json({ error: 'Authentication service is not configured.' }) }
})
authRouter.get('/me', requireAuth, (request, response) => response.json({ user: request.user }))
