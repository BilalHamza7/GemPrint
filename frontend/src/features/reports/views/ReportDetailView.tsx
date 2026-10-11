import { useCallback, useEffect, useState } from 'react'
import { generateIdentificationReport, getIdentificationReportUrl, getReport } from '../api/reportsApi'
import type { ReportDetail } from '../types/report'
import { ReportImagePanel } from '../components/ReportImagePanel'
import { ReportEditor } from '../components/ReportEditor'

export function ReportDetailView({ reportId, onBack }: { reportId: string; onBack: () => void }) {
  const [report, setReport] = useState<ReportDetail | null>(null)
  const [error, setError] = useState('')
  const [isGeneratingDocument, setIsGeneratingDocument] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const loadReport = useCallback(() => {
    void getReport(reportId)
      .then(setReport)
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Could not load report.'))
  }, [reportId])
  useEffect(loadReport, [loadReport])

  async function generateDocument() {
    setError('')
    setIsGeneratingDocument(true)
    try {
      await generateIdentificationReport(reportId)
      const { signedUrl } = await getIdentificationReportUrl(reportId)
      window.open(signedUrl, '_blank', 'noopener,noreferrer')
      loadReport()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not generate the identification report.')
    } finally {
      setIsGeneratingDocument(false)
    }
  }

  async function downloadDocument() {
    try {
      const { signedUrl } = await getIdentificationReportUrl(reportId)
      window.open(signedUrl, '_blank', 'noopener,noreferrer')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not open the identification report.')
    }
  }
  if (error)
    return (
      <section className="mx-auto max-w-5xl px-6 py-12">
        <button className="text-stone-400" onClick={onBack}>
          ← Registry
        </button>
        <p className="mt-8 text-red-300">{error}</p>
      </section>
    )
  if (!report) return <section className="mx-auto max-w-5xl px-6 py-12 text-stone-400">Loading report…</section>
  const fields = [
    ['Species', report.species],
    ['Variety', report.variety],
    ['Weight', `${report.carat_weight} ct`],
    ['Colour', report.colour],
    ['Cut / shape', report.cut_shape],
    ['Dimensions', report.dimensions],
    ['Issued', report.issue_date],
  ]
  const fingerprint = report.fingerprint_data[0]
  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <button className="text-sm text-stone-400 hover:text-stone-200" onClick={onBack}>
        ← Back to registry
      </button>
      <div className="mt-8">
        <p className="text-sm font-semibold tracking-[0.2em] text-amber-400">REPORT DETAIL</p>
        <h1 className="mt-2 text-4xl font-semibold">{report.serial_number}</h1>
        <p className="mt-2 text-stone-400">
          Private laboratory record created {new Date(report.created_at).toLocaleDateString()}.
        </p>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setIsEditing((editing) => !editing)}
          className="rounded-lg border border-stone-700 px-4 py-2.5 text-sm text-stone-200 hover:border-stone-500"
        >
          {isEditing ? 'Close editor' : 'Edit report'}
        </button>
        <button
          type="button"
          disabled={isGeneratingDocument}
          onClick={() => void generateDocument()}
          className="rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-stone-950 disabled:opacity-60"
        >
          {isGeneratingDocument
            ? 'Generating…'
            : report.pdf_path
              ? 'Regenerate identification report'
              : 'Generate identification report'}
        </button>
        {report.pdf_path && (
          <button
            type="button"
            onClick={() => void downloadDocument()}
            className="rounded-lg border border-stone-700 px-4 py-2.5 text-sm text-stone-200 hover:border-stone-500"
          >
            Download PDF
          </button>
        )}
      </div>
      {isEditing && (
        <ReportEditor
          report={report}
          onCancel={() => setIsEditing(false)}
          onSaved={() => {
            setIsEditing(false)
            loadReport()
          }}
        />
      )}
      <div className="mt-9 grid gap-5 md:grid-cols-2">
        {fields.map(([label, value]) => (
          <article className="rounded-xl border border-stone-800 bg-stone-900/30 p-5" key={label}>
            <p className="text-xs uppercase tracking-wider text-stone-500">{label}</p>
            <p className="mt-2 font-medium text-stone-100">{value}</p>
          </article>
        ))}
      </div>
      <article className="mt-5 rounded-xl border border-stone-800 bg-stone-900/30 p-5">
        <p className="text-xs uppercase tracking-wider text-stone-500">Observations</p>
        <p className="mt-2 whitespace-pre-wrap leading-7 text-stone-300">
          {report.comments || 'No observations recorded.'}
        </p>
      </article>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <ReportImagePanel
          reportId={report.id}
          kind="macro"
          title="Main report image"
          hasImage={Boolean(report.macro_image_path)}
          onChanged={loadReport}
        />
        <ReportImagePanel
          reportId={report.id}
          kind="inclusion"
          title="Fingerprint reference image"
          hasImage={Boolean(report.inclusion_image_path)}
          onChanged={loadReport}
        />
      </div>
      <article className="mt-5 rounded-xl border border-stone-800 bg-stone-900/30 p-5">
        <p className="text-xs uppercase tracking-wider text-stone-500">Microscopic reference capture</p>
        <p className="mt-2 text-sm leading-6 text-stone-400">
          These capture conditions should be reproduced as closely as possible when a laboratory later verifies the
          gemstone against its microscopic reference image.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CaptureField label="Magnification" value={report.micro_image_magnification} />
          <CaptureField label="Lighting" value={report.micro_image_lighting} />
          <CaptureField label="Microscope" value={report.micro_image_microscope} />
          <CaptureField label="Capture device" value={report.micro_image_device} />
          <CaptureField label="Capture date" value={report.micro_image_captured_on} />
          <CaptureField label="Inclusion area" value={report.micro_image_area_notes} />
        </div>
        <CaptureField label="Capture notes" value={report.micro_image_capture_notes} className="mt-4" />
      </article>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <FingerprintStatus fingerprint={fingerprint} isReady={Boolean(report.fingerprint_hash)} />
        <StatusCard title="Verification history" value={`${report.verification_logs.length} recorded result(s)`} />
      </div>
    </section>
  )
}

function CaptureField({ label, value, className = '' }: { label: string; value: string | null; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs uppercase tracking-wider text-stone-500">{label}</p>
      <p className="mt-1 text-sm leading-6 text-stone-200">{value || 'Not recorded'}</p>
    </div>
  )
}

function StatusCard({ title, value }: { title: string; value: string }) {
  return (
    <article className="rounded-xl border border-stone-800 p-5">
      <p className="text-xs uppercase tracking-wider text-stone-500">{title}</p>
      <p className="mt-2 text-sm font-medium text-stone-200">{value}</p>
    </article>
  )
}

function FingerprintStatus({
  fingerprint,
  isReady,
}: {
  fingerprint: ReportDetail['fingerprint_data'][number] | undefined
  isReady: boolean
}) {
  if (!isReady || !fingerprint) return <StatusCard title="Fingerprint" value="Extraction pending" />

  const metadata = fingerprint.preprocessing_metadata_json
  const roiWidth = metadata.standard_roi_width
  const roiHeight = metadata.standard_roi_height
  return (
    <article className="rounded-xl border border-emerald-900/70 bg-emerald-950/20 p-5">
      <p className="text-xs uppercase tracking-wider text-emerald-300">Fingerprint ready</p>
      <p className="mt-2 text-sm font-medium text-stone-100">
        {fingerprint.keypoint_count} SIFT keypoints · quality {fingerprint.quality_score ?? '—'}%
      </p>
      <p className="mt-2 text-xs leading-5 text-stone-400">
        {String(roiWidth ?? 1280)} × {String(roiHeight ?? 960)} standard ROI · {fingerprint.algorithm_version}
      </p>
    </article>
  )
}
