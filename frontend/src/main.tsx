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
        <div className="mt-10 flex gap-4"><button className="rounded-lg bg-amber-400 px-5 py-3 font-semibold text-stone-950">Get started</button><button className="rounded-lg border border-stone-600 px-5 py-3 font-semibold">Learn more</button></div>
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
