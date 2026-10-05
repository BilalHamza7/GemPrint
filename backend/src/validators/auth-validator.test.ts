import { describe, expect, it } from 'vitest'
import { validateLogin, validateRegistration } from './auth-validator.js'

describe('authentication request validation', () => {
  it('accepts a complete laboratory registration', () => {
    const registration = validateRegistration({
      fullName: 'Ayesha Perera',
      email: 'AYESHA@EXAMPLE.COM',
      password: 'secure-password-1',
      legalName: 'Perera Gem Laboratory (Pvt) Ltd',
      displayName: 'Perera Gem Laboratory',
      businessEmail: 'office@example.com',
      country: 'Sri Lanka',
    })

    expect(registration).toMatchObject({
      email: 'ayesha@example.com',
      fullName: 'Ayesha Perera',
      business: { displayName: 'Perera Gem Laboratory', country: 'Sri Lanka' },
    })
  })

  it('rejects incomplete laboratory registration', () => {
    expect(validateRegistration({ email: 'test@example.com', password: 'secure-password-1' })).toBeNull()
  })

  it('normalizes a valid sign-in email', () => {
    expect(validateLogin({ email: ' TEST@EXAMPLE.COM ', password: 'secure-password-1' })).toEqual({
      email: 'test@example.com',
      password: 'secure-password-1',
    })
  })
})
