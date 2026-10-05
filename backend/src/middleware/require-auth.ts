import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export async function requireAuth(request: Request, response: Response, next: NextFunction) {
  const token = request.header('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return response.status(401).json({ error: 'Authentication is required.' })
  if (!env.JWT_SECRET) return response.status(503).json({ error: 'Authentication is not configured.' })
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { issuer: 'gemprint-api', audience: 'gemprint-web' })
    if (typeof payload === 'string' || !payload.sub || typeof payload.email !== 'string' || typeof payload.laboratoryId !== 'string' || !['owner', 'admin', 'gemmologist', 'viewer'].includes(String(payload.role))) return response.status(401).json({ error: 'Invalid or expired session.' })
    request.user = { id: payload.sub, email: payload.email, laboratoryId: payload.laboratoryId, role: payload.role as 'owner' | 'admin' | 'gemmologist' | 'viewer' }
    return next()
  } catch { return response.status(401).json({ error: 'Invalid or expired session.' }) }
}
