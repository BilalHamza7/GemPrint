import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

function App() {
  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <p className="mb-5 text-sm font-semibold tracking-[0.28em] text-amber-400">GEMPRINT</p>
        <h1 className="max-w-3xl text-5xl font-semibold tracking-tight sm:text-7xl">Optical identity for remarkable stones.</h1>
        <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-300">A research platform for private gemstone registration and later verification using microscopic inclusion fingerprints.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-3"><article className="rounded-xl border border-stone-800 p-5"><b>Register</b><p className="mt-2 text-sm text-stone-400">Create a private gemstone report.</p></article><article className="rounded-xl border border-stone-800 p-5"><b>Fingerprint</b><p className="mt-2 text-sm text-stone-400">Capture inclusion identity evidence.</p></article><article className="rounded-xl border border-stone-800 p-5"><b>Verify</b><p className="mt-2 text-sm text-stone-400">Compare a later micrograph privately.</p></article></div>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
