import type { Request, Response } from 'express'
import { AuthService } from '../services/auth-service.js'
import { validateCredentials } from '../validators/auth-validator.js'

const auth = new AuthService()

export async function register(request: Request, response: Response) {
  const credentials = validateCredentials(request.body, true)
  if (!credentials) return response.status(400).json({ error: 'Invalid registration data.' })
  try { const { data, error } = await auth.register(credentials); return error ? response.status(400).json({ error: error.message }) : response.status(201).json({ user: data.user, session: data.session }) } catch { return response.status(503).json({ error: 'Authentication service is not configured.' }) }
}

export async function login(request: Request, response: Response) {
  const credentials = validateCredentials(request.body, false)
  if (!credentials) return response.status(400).json({ error: 'Invalid login data.' })
  try { const { data, error } = await auth.login(credentials); return error ? response.status(401).json({ error: 'Invalid email or password.' }) : response.json({ user: data.user, session: data.session }) } catch { return response.status(503).json({ error: 'Authentication service is not configured.' }) }
}
