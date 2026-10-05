export type SessionUser = {
  id: string
  email: string
  fullName: string
  laboratoryId: string
  laboratoryName: string
  role: 'owner' | 'admin' | 'gemmologist' | 'viewer'
}

export type BrowserSession = { token: string; user: SessionUser }

const sessionStorageKey = 'gemprint.session'

export function getStoredSession(): BrowserSession | null {
  try {
    const value = window.localStorage.getItem(sessionStorageKey)
    if (!value) return null
    const session = JSON.parse(value) as BrowserSession
    return session.token && session.user?.id ? session : null
  } catch {
    return null
  }
}

export function saveSession(session: BrowserSession) {
  window.localStorage.setItem(sessionStorageKey, JSON.stringify(session))
}

export function clearSession() {
  window.localStorage.removeItem(sessionStorageKey)
}

async function request<T>(path: string, init: RequestInit = {}, authenticated: boolean): Promise<T> {
  const session = getStoredSession()
  if (authenticated && !session?.token) throw new Error('Your session has expired. Please sign in again.')
  const isFormData = init.body instanceof FormData
  const response = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
      ...init.headers,
    },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401) clearSession()
    throw new Error(body.error ?? 'Request failed.')
  }
  return body as T
}

/** Makes a request to a protected GemPrint API endpoint. */
export function api<T>(path: string, init: RequestInit = {}) {
  return request<T>(path, init, true)
}

/** Makes a request to a public GemPrint API endpoint, such as sign-in. */
export function publicApi<T>(path: string, init: RequestInit = {}) {
  return request<T>(path, init, false)
}
