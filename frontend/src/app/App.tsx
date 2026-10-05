import { useState } from 'react'
import { AppShell, type AppPage } from '../components/AppShell'
import { AuthView } from '../features/auth/views/AuthView'
import { DashboardView } from '../features/dashboard/views/DashboardView'
import { HomeView } from '../features/home/views/HomeView'
import { RegisterReportView } from '../features/reports/views/RegisterReportView'
import { ReportDetailView } from '../features/reports/views/ReportDetailView'
import { VerificationView } from '../features/verification/views/VerificationView'
import { api, clearSession, getStoredSession, type SessionUser } from '../lib/api'

/** Owns application navigation and the GemPrint browser-session lifecycle. */
export function App() {
  const [page, setPage] = useState<AppPage>('home')
  const [user, setUser] = useState<SessionUser | null>(() => getStoredSession()?.user ?? null)
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)

  function navigate(nextPage: AppPage) {
    if (['dashboard', 'register', 'detail', 'verify'].includes(nextPage) && !user) {
      setPage('auth')
      return
    }
    setPage(nextPage)
  }

  function authenticated(nextUser: SessionUser) {
    setUser(nextUser)
    setPage('dashboard')
  }

  async function signOut() {
    try { await api('/api/auth/logout', { method: 'POST' }) } catch { /* Local clearance is still the safe logout action. */ }
    clearSession()
    setUser(null)
    setSelectedReportId(null)
    setPage('home')
  }

  const content = page === 'auth' ? <AuthView onAuthenticated={authenticated} onBack={() => navigate('home')} />
    : page === 'dashboard' ? <DashboardView onNavigate={navigate} onOpenReport={(id) => { setSelectedReportId(id); navigate('detail') }} />
      : page === 'register' ? <RegisterReportView onComplete={() => navigate('dashboard')} onCancel={() => navigate('dashboard')} />
        : page === 'detail' && selectedReportId ? <ReportDetailView reportId={selectedReportId} onBack={() => navigate('dashboard')} />
        : page === 'verify' ? <VerificationView onBack={() => navigate('dashboard')} />
          : <HomeView onStart={() => navigate(user ? 'dashboard' : 'auth')} />

  return <AppShell user={user} page={page} onNavigate={navigate} onSignOut={() => void signOut()}>{content}</AppShell>
}
