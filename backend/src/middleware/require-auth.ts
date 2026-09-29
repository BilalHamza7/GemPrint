import type { NextFunction, Request, Response } from 'express'
import { getSupabaseAuthClient } from '../config/supabase.js'

export async function requireAuth(request: Request, response: Response, next: NextFunction) {
  const token = request.header('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return response.status(401).json({ error: 'Authentication is required.' })
  try {
    const { data, error } = await getSupabaseAuthClient().auth.getUser(token)
    if (error || !data.user) return response.status(401).json({ error: 'Invalid or expired session.' })
    request.user = data.user
    return next()
  } catch { return response.status(503).json({ error: 'Authentication service is not configured.' }) }
}
