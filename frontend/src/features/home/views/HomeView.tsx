export function HomeView({ onStart }: { onStart: () => void }) {
  const stages = [
    ['Register', 'Record the report identity and gemmological observations.'],
    ['Fingerprint', 'Associate a computer-vision inclusion fingerprint with a report.'],
    ['Verify', 'Compare a later microscopy image against your private registry.'],
  ]
  return (
    <section className="mx-auto flex min-h-[calc(100vh-73px)] max-w-6xl flex-col justify-center px-6 py-16">
      <p className="mb-5 text-sm font-semibold tracking-[0.28em] text-amber-400">INCLUSION FINGERPRINTING</p>
      <h1 className="max-w-4xl text-5xl font-semibold tracking-tight sm:text-7xl">
        Optical identity for remarkable stones.
      </h1>
      <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-300">
        GemPrint gives a laboratory a private registry for gemstone reports and a reproducible way to compare
        microscopic inclusion images later.
      </p>
      <div className="mt-10">
        <button
          className="rounded bg-amber-400 px-5 py-3 font-semibold text-stone-950 hover:bg-amber-300"
          onClick={onStart}
        >
          Open laboratory workspace
        </button>
      </div>
      <div className="mt-16 grid max-w-4xl gap-4 md:grid-cols-3">
        {stages.map(([title, description]) => (
          <article className="rounded-xl border border-stone-800 bg-stone-900/40 p-5" key={title}>
            <h2 className="font-semibold text-amber-300">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-stone-400">{description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
