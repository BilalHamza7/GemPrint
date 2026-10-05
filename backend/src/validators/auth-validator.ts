import type { LoginCredentials, RegisterCredentials } from '../models/auth.js'

function optionalText(value: unknown, maximum = 160) {
  if (value === undefined || value === null || value === '') return undefined
  return typeof value === 'string' && value.trim().length <= maximum ? value.trim() : null
}

function validEmail(value: unknown) {
  return typeof value === 'string' && /^\S+@\S+\.\S+$/.test(value.trim()) ? value.trim().toLowerCase() : null
}

export function validateLogin(body: unknown): LoginCredentials | null {
  if (!body || typeof body !== 'object') return null
  const { email, password } = body as Record<string, unknown>
  const normalizedEmail = validEmail(email)
  if (!normalizedEmail || typeof password !== 'string' || password.length < 8 || password.length > 128) return null
  return { email: normalizedEmail, password }
}

export function validateRegistration(body: unknown): RegisterCredentials | null {
  const login = validateLogin(body)
  if (!login || !body || typeof body !== 'object') return null
  const values = body as Record<string, unknown>
  const fullName = optionalText(values.fullName, 120)
  const legalName = optionalText(values.legalName, 180)
  const displayName = optionalText(values.displayName, 180)
  const businessEmail = validEmail(values.businessEmail ?? values.email)
  if (!fullName || fullName.length < 2 || !legalName || legalName.length < 2 || !displayName || displayName.length < 2 || !businessEmail) return null
  const phone = optionalText(values.phone, 40)
  const jobTitle = optionalText(values.jobTitle, 100)
  const registrationNumber = optionalText(values.registrationNumber, 100)
  const businessPhone = optionalText(values.businessPhone, 40)
  const website = optionalText(values.website, 240)
  const addressLine1 = optionalText(values.addressLine1, 240)
  const city = optionalText(values.city, 120)
  const country = optionalText(values.country, 120)
  if ([phone, jobTitle, registrationNumber, businessPhone, website, addressLine1, city, country].some((value) => value === null)) return null
  return { ...login, fullName, ...(phone ? { phone } : {}), ...(jobTitle ? { jobTitle } : {}), laboratory: { legalName, displayName, businessEmail, ...(registrationNumber ? { registrationNumber } : {}), ...(businessPhone ? { businessPhone } : {}), ...(website ? { website } : {}), ...(addressLine1 ? { addressLine1 } : {}), ...(city ? { city } : {}), ...(country ? { country } : {}) } }
}
