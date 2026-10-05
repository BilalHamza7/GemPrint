export type LoginCredentials = { email: string; password: string }

export type RegisterCredentials = LoginCredentials & {
  fullName: string
  phone?: string
  jobTitle?: string
  laboratory: {
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
}

export type AuthenticatedUser = {
  id: string
  email: string
  fullName: string
  laboratoryId: string
  laboratoryName: string
  role: 'owner' | 'admin' | 'gemmologist' | 'viewer'
}
