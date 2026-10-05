import { getSupabaseAdminClient } from '../config/supabase.js'

export type Profile = {
  full_name: string | null
  laboratory_name: string | null
  legal_business_name: string | null
  business_registration_number: string | null
  business_email: string | null
  business_phone: string | null
  website: string | null
  address_line_1: string | null
  city: string | null
  country: string | null
}

export class ProfileRepository {
  async findById(userId: string) {
    const { data, error } = await getSupabaseAdminClient()
      .from('profiles')
      .select(
        'full_name, laboratory_name, legal_business_name, business_registration_number, business_email, business_phone, website, address_line_1, city, country',
      )
      .eq('id', userId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data as Profile | null
  }
}
