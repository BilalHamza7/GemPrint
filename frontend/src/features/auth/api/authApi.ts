import { publicApi, type BrowserSession } from '../../../lib/api'

export type RegistrationInput = {
  fullName: string
  email: string
  password: string
  phone?: string
  jobTitle?: string
  legalName: string
  displayName: string
  registrationNumber?: string
  businessEmail: string
  businessPhone?: string
  website?: string
  addressLine1?: string
  city?: string
  country?: string
}

export function registerAccount(input: RegistrationInput) {
  return publicApi<BrowserSession>('/api/auth/register', { method: 'POST', body: JSON.stringify(input) })
}

export function loginAccount(email: string, password: string) {
  return publicApi<BrowserSession>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
}
