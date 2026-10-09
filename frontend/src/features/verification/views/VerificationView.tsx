import { useState } from 'react'
import { findReportBySerial } from '../../reports/api/reportsApi'

export function VerificationView({ onBack, onOpenReport }: { onBack: () => void; onOpenReport: (id: string) => void }) {
  const [serialNumber, setSerialNumber] = useState('')
  const [error, setError] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [result, setResult] = useState<Awaited<ReturnType<typeof findReportBySerial>> | null>(null)

  async function findReport() {
    const value = serialNumber.trim()
    if (!value) {
      setError('Enter the laboratory report serial number.')
      return
    }
    setError('')
    setResult(null)
    setIsSearching(true)
    try {
      setResult(await findReportBySerial(value))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The report could not be found.')
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-6 py-12">
      <button className="text-sm text-stone-400 hover:text-stone-200" onClick={onBack}>
        ← Back to registry
      </button>
      <p className="mt-8 text-sm font-semibold tracking-[0.2em] text-amber-400">VERIFICATION</p>
      <h1 className="mt-2 text-4xl font-semibold">Find a gemstone for verification</h1>
      <p className="mt-3 leading-7 text-stone-400">
        Start with the unique report serial issued by your laboratory. GemPrint checks only records that belong to your
        laboratory account, then opens the full gemstone profile and its microscopic reference context.
      </p>
      <div className="mt-8 rounded-xl border border-stone-800 bg-stone-900/30 p-6">
        <label className="block text-sm text-stone-300">
          Report serial number
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              value={serialNumber}
              onChange={(event) => setSerialNumber(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void findReport()
              }}
              placeholder="e.g. GP-2026-001"
              className="min-w-0 flex-1 rounded-lg border border-stone-700 bg-stone-950 px-3 py-3 outline-none placeholder:text-stone-600 focus:border-amber-400"
            />
            <button
              type="button"
              disabled={isSearching}
              onClick={() => void findReport()}
              className="rounded-lg bg-amber-400 px-5 py-3 font-semibold text-stone-950 disabled:opacity-60"
            >
              {isSearching ? 'Finding…' : 'Find report'}
            </button>
          </div>
        </label>
        {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
        {result && (
          <article className="mt-5 rounded-lg border border-emerald-900/70 bg-emerald-950/20 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Gemstone record found</p>
            <h2 className="mt-2 text-xl font-semibold text-stone-100">{result.serial_number}</h2>
            <p className="mt-1 text-sm text-stone-300">
              {result.species} · {result.variety}
            </p>
            <p className="mt-3 text-sm text-stone-400">
              {result.fingerprint_hash
                ? 'A microscopic fingerprint is recorded for this report.'
                : 'The microscopic reference image is stored, but fingerprint extraction is not yet complete.'}
            </p>
            <button
              type="button"
              onClick={() => onOpenReport(result.id)}
              className="mt-4 rounded-lg border border-emerald-700 px-4 py-2 text-sm font-medium text-emerald-200 hover:border-emerald-400"
            >
              Open gemstone profile
            </button>
          </article>
        )}
      </div>
      <p className="mt-6 text-sm leading-6 text-stone-500">
        Image-to-fingerprint comparison will be added through the authenticated Node API after the CV enrollment module
        is implemented. The browser will not call the Python service directly.
      </p>
    </section>
  )
}
