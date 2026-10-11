import { useState } from 'react'
import { MicroscopicImageCropper, type MicroscopicImageFrame } from '../../../components/MicroscopicImageCropper'
import { findReportBySerial, verifyReport, type VerificationOutcome } from '../../reports/api/reportsApi'

export function VerificationView({ onBack, onOpenReport }: { onBack: () => void; onOpenReport: (id: string) => void }) {
  const [serialNumber, setSerialNumber] = useState('')
  const [queryImage, setQueryImage] = useState<File | null>(null)
  const [queryFrame, setQueryFrame] = useState<MicroscopicImageFrame | null>(null)
  const [error, setError] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [report, setReport] = useState<Awaited<ReturnType<typeof findReportBySerial>> | null>(null)
  const [outcome, setOutcome] = useState<VerificationOutcome | null>(null)

  async function findReport() {
    const value = serialNumber.trim()
    if (!value) return setError('Enter the laboratory report serial number.')
    setError('')
    setReport(null)
    setOutcome(null)
    setIsSearching(true)
    try {
      setReport(await findReportBySerial(value))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The report could not be found.')
    } finally {
      setIsSearching(false)
    }
  }

  async function submitVerification() {
    if (!report) return
    if (!queryImage) return setError('Select the new microscopic query image to compare.')
    if (!queryFrame) return setError('Position and confirm the standard microscopic fingerprint frame to compare.')
    setError('')
    setOutcome(null)
    setIsVerifying(true)
    try {
      setOutcome(await verifyReport(report.id, queryImage))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The verification could not be completed.')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-6 py-12">
      <button className="text-sm text-stone-400 hover:text-stone-200" onClick={onBack}>
        ← Back to registry
      </button>
      <p className="mt-8 text-sm font-semibold tracking-[0.2em] text-amber-400">VERIFICATION</p>
      <h1 className="mt-2 text-4xl font-semibold">Verify a gemstone fingerprint</h1>
      <p className="mt-3 leading-7 text-stone-400">
        Find a laboratory report, then compare a newly captured microscopic image with its enrolled reference image.
      </p>
      <div className="mt-8 rounded-xl border border-stone-800 bg-stone-900/30 p-6">
        <label className="block text-sm text-stone-300">
          Report serial number
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              value={serialNumber}
              onChange={(event) => setSerialNumber(event.target.value.toUpperCase())}
              onKeyDown={(event) => event.key === 'Enter' && void findReport()}
              placeholder="e.g. GP-A7K2Q"
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
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-300">
            {error}
          </p>
        )}
        {report && (
          <article className="mt-5 rounded-lg border border-emerald-900/70 bg-emerald-950/20 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Gemstone record found</p>
            <h2 className="mt-2 text-xl font-semibold text-stone-100">{report.serial_number}</h2>
            <p className="mt-1 text-sm text-stone-300">
              {report.species} · {report.variety}
            </p>
            {!report.fingerprint_hash ? (
              <p className="mt-3 text-sm text-amber-200">
                This report has no usable enrolled fingerprint. Re-upload a clear reference image from the profile.
              </p>
            ) : (
              <>
                <MicroscopicImageCropper
                  label="Microscopic query image"
                  helperText="Choose a new microscope image and position the same physical inclusion inside the standard fingerprint frame."
                  file={queryImage}
                  onFileChange={setQueryImage}
                  frame={queryFrame}
                  onFrameChange={setQueryFrame}
                />
                <button
                  type="button"
                  disabled={isVerifying || !queryImage || !queryFrame}
                  onClick={() => void submitVerification()}
                  className="mt-4 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-stone-950 disabled:opacity-60"
                >
                  {isVerifying ? 'Comparing fingerprint…' : 'Verify microscopic image'}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => onOpenReport(report.id)}
              className="ml-3 mt-4 rounded-lg border border-emerald-700 px-4 py-2 text-sm font-medium text-emerald-200 hover:border-emerald-400"
            >
              Open gemstone profile
            </button>
          </article>
        )}
        {outcome && <VerificationResult outcome={outcome} />}
      </div>
    </section>
  )
}

function VerificationResult({ outcome }: { outcome: VerificationOutcome }) {
  const { result } = outcome
  const tone =
    result.verdict === 'verified'
      ? 'border-emerald-700 bg-emerald-950/30 text-emerald-200'
      : result.verdict === 'not_verified'
        ? 'border-red-800 bg-red-950/30 text-red-200'
        : 'border-amber-700 bg-amber-950/30 text-amber-200'
  return (
    <section className={`mt-5 rounded-lg border p-5 ${tone}`}>
      <p className="text-xs font-semibold uppercase tracking-wider">Verification result</p>
      <h3 className="mt-2 text-xl font-semibold">{result.verdict.replace('_', ' ')}</h3>
      <p className="mt-2 text-sm">
        {result.reason ?? 'The result and supporting metrics are recorded in the private verification audit log.'}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Metric label="Good matches" value={result.good_match_count} />
        <Metric label="RANSAC inliers" value={result.inlier_count} />
        <Metric
          label="Inlier ratio"
          value={result.inlier_ratio === undefined ? undefined : `${(result.inlier_ratio * 100).toFixed(1)}%`}
        />
        <Metric label="Processing time" value={`${result.latency_ms} ms`} />
      </dl>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div>
      <dt className="text-stone-400">{label}</dt>
      <dd className="mt-1 font-medium text-stone-100">{value ?? '—'}</dd>
    </div>
  )
}
