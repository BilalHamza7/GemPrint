import type { Request, Response } from 'express'
import { env } from '../config/env.js'
import { AuthService } from '../services/auth-service.js'
import { validateLogin, validateRegistration } from '../validators/auth-validator.js'

const auth = new AuthService()

export async function register(request: Request, response: Response) {
  if (!env.JWT_SECRET) return response.status(503).json({ error: 'Authentication is not configured.' })
  const credentials = validateRegistration(request.body)
  if (!credentials) return response.status(400).json({ error: 'Provide valid account and laboratory details.' })
  try { return response.status(201).json(await auth.register(credentials)) } catch (caught) { return response.status(400).json({ error: caught instanceof Error ? caught.message : 'Unable to create the account.' }) }
}

export async function login(request: Request, response: Response) {
  if (!env.JWT_SECRET) return response.status(503).json({ error: 'Authentication is not configured.' })
  const credentials = validateLogin(request.body)
  if (!credentials) return response.status(400).json({ error: 'Invalid login data.' })
  try { return response.json(await auth.login(credentials)) } catch (caught) { return response.status(401).json({ error: caught instanceof Error ? caught.message : 'Invalid email or password.' }) }
}
