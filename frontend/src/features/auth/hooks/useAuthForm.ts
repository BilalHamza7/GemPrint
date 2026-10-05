import { useState } from 'react'
import { supabase } from '../../../lib/supabase'

export type AuthMode = 'sign-in' | 'register'

export function useAuthForm(onAuthenticated: () => void) {
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  async function submit(form: HTMLFormElement) {
    if (!supabase) return setError('Supabase browser authentication is not configured.')
    const fields = new FormData(form)
    const email = String(fields.get('email') ?? '').trim()
    const password = String(fields.get('password') ?? '')
    const fullName = String(fields.get('fullName') ?? '').trim()
    setError(''); setMessage(''); setIsSubmitting(true)
    const result = mode === 'register' ? await supabase.auth.signUp({ email, password, options: { data: fullName ? { full_name: fullName } : undefined } }) : await supabase.auth.signInWithPassword({ email, password })
    setIsSubmitting(false)
    if (result.error) return setError(result.error.message)
    if (mode === 'register' && !result.data.session) { setMessage('Registration received. Confirm the email sent by Supabase, then sign in.'); setMode('sign-in'); return }
    onAuthenticated()
  }
  return { mode, setMode, error, message, isSubmitting, submit }
}
