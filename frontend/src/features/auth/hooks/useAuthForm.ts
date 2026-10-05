import { useState } from 'react'
import { saveSession, type SessionUser } from '../../../lib/api'
import { loginAccount, registerAccount } from '../api/authApi'

export type AuthMode = 'sign-in' | 'register'

export function useAuthForm(onAuthenticated: (user: SessionUser) => void) {
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  async function submit(form: HTMLFormElement) {
    const fields = new FormData(form)
    const email = String(fields.get('email') ?? '').trim()
    const password = String(fields.get('password') ?? '')
    const fullName = String(fields.get('fullName') ?? '').trim()
    setError('')
    setMessage('')
    setIsSubmitting(true)
    try {
      const session =
        mode === 'register'
          ? await registerAccount({
              fullName,
              email,
              password,
              phone: String(fields.get('phone') ?? '').trim() || undefined,
              jobTitle: String(fields.get('jobTitle') ?? '').trim() || undefined,
              legalName: String(fields.get('legalName') ?? '').trim(),
              displayName: String(fields.get('displayName') ?? '').trim(),
              registrationNumber: String(fields.get('registrationNumber') ?? '').trim() || undefined,
              businessEmail: String(fields.get('businessEmail') ?? '').trim() || email,
              businessPhone: String(fields.get('businessPhone') ?? '').trim() || undefined,
              website: String(fields.get('website') ?? '').trim() || undefined,
              addressLine1: String(fields.get('addressLine1') ?? '').trim() || undefined,
              city: String(fields.get('city') ?? '').trim() || undefined,
              country: String(fields.get('country') ?? '').trim() || undefined,
            })
          : await loginAccount(email, password)
      saveSession(session)
      onAuthenticated(session.user)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to continue.')
    } finally {
      setIsSubmitting(false)
    }
  }
  return { mode, setMode, error, message, isSubmitting, submit }
}
