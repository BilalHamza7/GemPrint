import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { AppShell, type AppPage } from '../components/AppShell'
import { AuthView } from '../features/auth/views/AuthView'
import { DashboardView } from '../features/dashboard/views/DashboardView'
import { HomeView } from '../features/home/views/HomeView'
import { RegisterReportView } from '../features/reports/views/RegisterReportView'
import { ReportDetailView } from '../features/reports/views/ReportDetailView'
import { VerificationView } from '../features/verification/views/VerificationView'
import { supabase } from '../lib/supabase'

/** Owns application navigation and the browser-authentication session lifecycle. */
export function App() {
  const [page, setPage] = useState<AppPage>('home')
  const [user, setUser] = useState<User | null>(null)
  const [isSessionLoading, setIsSessionLoading] = useState(true)
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      setIsSessionLoading(false)
      return
    }
    void supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      if (data.session) setPage('dashboard')
      setIsSessionLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session) setPage('home')
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  function navigate(nextPage: AppPage) {
    if (['dashboard', 'register', 'detail', 'verify'].includes(nextPage) && !user) {
      setPage('auth')
      return
    }
    setPage(nextPage)
  }

  if (isSessionLoading) return <main className="grid min-h-screen place-items-center bg-stone-950 text-stone-300">Restoring laboratory session…</main>

  const content = page === 'auth' ? <AuthView onAuthenticated={() => navigate('dashboard')} onBack={() => navigate('home')} />
    : page === 'dashboard' ? <DashboardView onNavigate={navigate} onOpenReport={(id) => { setSelectedReportId(id); navigate('detail') }} />
      : page === 'register' ? <RegisterReportView onComplete={() => navigate('dashboard')} onCancel={() => navigate('dashboard')} />
        : page === 'detail' && selectedReportId ? <ReportDetailView reportId={selectedReportId} onBack={() => navigate('dashboard')} />
        : page === 'verify' ? <VerificationView onBack={() => navigate('dashboard')} />
          : <HomeView onStart={() => navigate(user ? 'dashboard' : 'auth')} />

  return <AppShell user={user} page={page} onNavigate={navigate}>{content}</AppShell>
}
