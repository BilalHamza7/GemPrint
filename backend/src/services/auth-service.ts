import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { getSupabaseAdminClient } from '../config/supabase.js'
import type { AuthenticatedUser, LoginCredentials, RegisterCredentials } from '../models/auth.js'

type ProfileRow = { id: string; email: string; password_hash: string; full_name: string | null }
type MembershipRow = { role: AuthenticatedUser['role']; laboratories: { id: string; display_name: string } | null }

function createSession(user: AuthenticatedUser) {
  if (!env.JWT_SECRET) throw new Error('JWT_SECRET is not configured.')
  return jwt.sign({ email: user.email, laboratoryId: user.laboratoryId, role: user.role }, env.JWT_SECRET, { subject: user.id, expiresIn: '8h', issuer: 'gemprint-api', audience: 'gemprint-web' })
}

export class AuthService {
  async register(credentials: RegisterCredentials) {
    if (!env.JWT_SECRET) throw new Error('JWT_SECRET is not configured.')
    const client = getSupabaseAdminClient()
    const { data: existing, error: existingError } = await client.from('profiles').select('id').ilike('email', credentials.email).maybeSingle()
    if (existingError) throw new Error(existingError.message)
    if (existing) throw new Error('An account already exists for this email address.')
    const passwordHash = await bcrypt.hash(credentials.password, 12)
    const { data: profile, error: profileError } = await client.from('profiles').insert({ email: credentials.email, password_hash: passwordHash, full_name: credentials.fullName, phone: credentials.phone ?? null, job_title: credentials.jobTitle ?? null }).select('id, email, full_name').single()
    if (profileError || !profile) throw new Error(profileError?.message ?? 'Could not create the account.')
    const { data: laboratory, error: laboratoryError } = await client.from('laboratories').insert({ owner_user_id: profile.id, legal_name: credentials.laboratory.legalName, display_name: credentials.laboratory.displayName, registration_number: credentials.laboratory.registrationNumber ?? null, business_email: credentials.laboratory.businessEmail, business_phone: credentials.laboratory.businessPhone ?? null, website: credentials.laboratory.website ?? null, address_line_1: credentials.laboratory.addressLine1 ?? null, city: credentials.laboratory.city ?? null, country: credentials.laboratory.country ?? null }).select('id, display_name').single()
    if (laboratoryError || !laboratory) {
      await client.from('profiles').delete().eq('id', profile.id)
      throw new Error(laboratoryError?.message ?? 'Could not create the laboratory.')
    }
    const { error: memberError } = await client.from('laboratory_members').insert({ laboratory_id: laboratory.id, user_id: profile.id, role: 'owner' })
    if (memberError) {
      await client.from('laboratories').delete().eq('id', laboratory.id)
      await client.from('profiles').delete().eq('id', profile.id)
      throw new Error(memberError.message)
    }
    const user: AuthenticatedUser = { id: profile.id, email: profile.email, fullName: profile.full_name ?? credentials.fullName, laboratoryId: laboratory.id, laboratoryName: laboratory.display_name, role: 'owner' }
    return { user, token: createSession(user) }
  }

  async login(credentials: LoginCredentials) {
    if (!env.JWT_SECRET) throw new Error('JWT_SECRET is not configured.')
    const client = getSupabaseAdminClient()
    const { data: profile, error } = await client.from('profiles').select('id, email, password_hash, full_name').ilike('email', credentials.email).maybeSingle()
    if (error) throw new Error(error.message)
    if (!profile || !(await bcrypt.compare(credentials.password, (profile as ProfileRow).password_hash))) throw new Error('Invalid email or password.')
    const { data: membership, error: membershipError } = await client.from('laboratory_members').select('role, laboratories(id, display_name)').eq('user_id', profile.id).order('created_at', { ascending: true }).limit(1).maybeSingle()
    if (membershipError) throw new Error(membershipError.message)
    const joined = membership as unknown as MembershipRow | null
    if (!joined?.laboratories) throw new Error('This account is not assigned to a laboratory.')
    const user: AuthenticatedUser = { id: profile.id, email: profile.email, fullName: profile.full_name ?? '', laboratoryId: joined.laboratories.id, laboratoryName: joined.laboratories.display_name, role: joined.role }
    return { user, token: createSession(user) }
  }
}
