import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { getSupabaseAdminClient } from '../config/supabase.js'
import type { AuthenticatedUser, LoginCredentials, RegisterCredentials } from '../models/auth.js'

type ProfileRow = {
  id: string
  email: string
  password_hash: string
  full_name: string | null
  laboratory_name: string | null
}

function createSession(user: AuthenticatedUser) {
  if (!env.JWT_SECRET) throw new Error('JWT_SECRET is not configured.')
  return jwt.sign({ email: user.email }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: '8h',
    issuer: 'gemprint-api',
    audience: 'gemprint-web',
  })
}

export class AuthService {
  async register(credentials: RegisterCredentials) {
    if (!env.JWT_SECRET) throw new Error('JWT_SECRET is not configured.')
    const client = getSupabaseAdminClient()
    const { data: existing, error: existingError } = await client
      .from('profiles')
      .select('id')
      .ilike('email', credentials.email)
      .maybeSingle()
    if (existingError) throw new Error(existingError.message)
    if (existing) throw new Error('An account already exists for this email address.')
    const passwordHash = await bcrypt.hash(credentials.password, 12)
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .insert({
        email: credentials.email,
        password_hash: passwordHash,
        full_name: credentials.fullName,
        phone: credentials.phone ?? null,
        job_title: credentials.jobTitle ?? null,
        laboratory_name: credentials.business.displayName,
        legal_business_name: credentials.business.legalName,
        business_registration_number: credentials.business.registrationNumber ?? null,
        business_email: credentials.business.businessEmail,
        business_phone: credentials.business.businessPhone ?? null,
        website: credentials.business.website ?? null,
        address_line_1: credentials.business.addressLine1 ?? null,
        city: credentials.business.city ?? null,
        country: credentials.business.country ?? null,
      })
      .select('id, email, full_name, laboratory_name')
      .single()
    if (profileError || !profile) throw new Error(profileError?.message ?? 'Could not create the account.')
    const user: AuthenticatedUser = {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name ?? credentials.fullName,
      laboratoryName: profile.laboratory_name ?? credentials.business.displayName,
    }
    return { user, token: createSession(user) }
  }

  async login(credentials: LoginCredentials) {
    if (!env.JWT_SECRET) throw new Error('JWT_SECRET is not configured.')
    const client = getSupabaseAdminClient()
    const { data: profile, error } = await client
      .from('profiles')
      .select('id, email, password_hash, full_name, laboratory_name')
      .ilike('email', credentials.email)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!profile || !(await bcrypt.compare(credentials.password, (profile as ProfileRow).password_hash)))
      throw new Error('Invalid email or password.')
    const account = profile as ProfileRow
    const user: AuthenticatedUser = {
      id: account.id,
      email: account.email,
      fullName: account.full_name ?? '',
      laboratoryName: account.laboratory_name ?? 'GemPrint laboratory',
    }
    return { user, token: createSession(user) }
  }
}
