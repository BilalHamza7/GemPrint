import { Router } from 'express'
import { z } from 'zod'
import { getSupabaseAuthClient } from '../config/supabase.js'
import { requireAuth } from '../middleware/require-auth.js'

const credentials = z.object({ email: z.string().email(), password: z.string().min(8).max(128), fullName: z.string().trim().min(2).max(120).optional() })
export const authRouter = Router()
authRouter.post('/register', async (request, response) => {
  const parsed = credentials.safeParse(request.body)
  if (!parsed.success) return response.status(400).json({ error: 'Invalid registration data.' })
  try {
    const { email, password, fullName } = parsed.data
    const { data, error } = await getSupabaseAuthClient().auth.signUp({ email, password, options: { data: fullName ? { full_name: fullName } : undefined } })
    return error ? response.status(400).json({ error: error.message }) : response.status(201).json({ user: data.user, session: data.session })
  } catch { return response.status(503).json({ error: 'Authentication service is not configured.' }) }
})
authRouter.post('/login', async (request, response) => {
  const parsed = credentials.pick({ email: true, password: true }).safeParse(request.body)
  if (!parsed.success) return response.status(400).json({ error: 'Invalid login data.' })
  try {
    const { data, error } = await getSupabaseAuthClient().auth.signInWithPassword(parsed.data)
    return error ? response.status(401).json({ error: 'Invalid email or password.' }) : response.json({ user: data.user, session: data.session })
  } catch { return response.status(503).json({ error: 'Authentication service is not configured.' }) }
})
authRouter.get('/me', requireAuth, (request, response) => response.json({ user: request.user }))
