import type { Credentials } from '../models/auth.js'

export function validateCredentials(body: unknown, includeName: boolean): Credentials | null {
  if (!body || typeof body !== 'object') return null
  const { email, password, fullName } = body as Record<string, unknown>
  if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email) || typeof password !== 'string' || password.length < 8 || password.length > 128) return null
  if (includeName && fullName !== undefined && (typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.length > 120)) return null
  return { email: email.trim(), password, ...(typeof fullName === 'string' ? { fullName: fullName.trim() } : {}) }
}
