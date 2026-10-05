import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type AppPage = 'home' | 'auth' | 'dashboard' | 'register' | 'detail' | 'verify'

type AppShellProps = { children: ReactNode; user: User | null; page: AppPage; onNavigate: (page: AppPage) => void }

/** Shared chrome only; each feature owns its screen content. */
export function AppShell({ children, user, page, onNavigate }: AppShellProps) {
  if (page === 'auth') return <>{children}</>
  return <main className="min-h-screen bg-stone-950 text-stone-100"><header className="border-b border-stone-800/90"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4"><button className="text-left" onClick={() => onNavigate(user ? 'dashboard' : 'home')}><span className="block text-xs font-bold tracking-[0.28em] text-amber-400">GEMPRINT</span><span className="text-xs text-stone-500">Private gemmology workspace</span></button><nav className="flex items-center gap-2 text-sm">{user ? <><button className="rounded px-3 py-2 text-stone-300 hover:bg-stone-900" onClick={() => onNavigate('dashboard')}>Registry</button><button className="rounded px-3 py-2 text-stone-300 hover:bg-stone-900" onClick={() => onNavigate('verify')}>Verify</button><button className="rounded border border-stone-700 px-3 py-2 text-stone-300 hover:border-stone-500" onClick={() => void supabase?.auth.signOut()}>Sign out</button></> : <button className="rounded bg-amber-400 px-4 py-2 font-semibold text-stone-950" onClick={() => onNavigate('auth')}>Sign in</button>}</nav></div></header>{children}</main>
}
