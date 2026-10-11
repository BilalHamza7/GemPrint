import { api } from '../../../lib/api'
import type { CreateReportInput, GemstoneReport, ReportDetail } from '../types/report'
import type { MicroscopicImageFrame } from '../../../components/MicroscopicImageCropper'

export async function listReports(): Promise<GemstoneReport[]> {
  return (await api<{ reports: GemstoneReport[] }>('/api/reports')).reports
}
export async function createReport(input: CreateReportInput): Promise<GemstoneReport> {
  return (await api<{ report: GemstoneReport }>('/api/reports', { method: 'POST', body: JSON.stringify(input) })).report
}
export async function getReport(id: string): Promise<ReportDetail> {
  return (await api<{ report: ReportDetail }>(`/api/reports/${id}`)).report
}
export async function findReportBySerial(serialNumber: string) {
  return (
    await api<{
      report: Pick<
        GemstoneReport,
        | 'id'
        | 'serial_number'
        | 'species'
        | 'variety'
        | 'fingerprint_hash'
        | 'micro_image_magnification'
        | 'micro_image_lighting'
        | 'micro_image_microscope'
        | 'micro_image_device'
        | 'micro_image_area_notes'
        | 'micro_image_captured_on'
        | 'micro_image_capture_notes'
      >
    }>(`/api/reports/lookup/${encodeURIComponent(serialNumber)}`)
  ).report
}
export async function updateReport(id: string, input: Partial<CreateReportInput>): Promise<GemstoneReport> {
  return (await api<{ report: GemstoneReport }>(`/api/reports/${id}`, { method: 'PATCH', body: JSON.stringify(input) }))
    .report
}
export type MediaKind = 'macro' | 'inclusion'
export async function uploadReportImage(id: string, kind: MediaKind, file: File, frame?: MicroscopicImageFrame) {
  const body = new FormData()
  body.append('image', file)
  if (frame) body.append('frame', JSON.stringify(frame))
  return api<{ media: { path: string } }>(`/api/reports/${id}/media/${kind}`, { method: 'POST', body })
}
export async function getReportImageUrl(id: string, kind: MediaKind) {
  return api<{ signedUrl: string }>(`/api/reports/${id}/media/${kind}`)
}
export async function deleteReportImage(id: string, kind: MediaKind) {
  return api<void>(`/api/reports/${id}/media/${kind}`, { method: 'DELETE' })
}
export async function generateIdentificationReport(id: string) {
  return api<{ document: { path: string } }>(`/api/reports/${id}/documents/identification-report`, {
    method: 'POST',
  })
}
export async function getIdentificationReportUrl(id: string) {
  return api<{ signedUrl: string }>(`/api/reports/${id}/documents/identification-report`)
}

export type VerificationOutcome = {
  result: {
    verdict: 'verified' | 'not_verified' | 'inconclusive'
    reason?: string
    good_match_count?: number
    inlier_count?: number
    inlier_ratio?: number
    confidence_score?: number
    quality_score?: number
    latency_ms: number
  }
  log: { id: string; verified_at: string }
}

export async function verifyReport(id: string, file: File, frame: MicroscopicImageFrame): Promise<VerificationOutcome> {
  const body = new FormData()
  body.append('image', file)
  body.append('frame', JSON.stringify(frame))
  return (
    await api<{ verification: VerificationOutcome }>(`/api/reports/${id}/verifications`, { method: 'POST', body })
  ).verification
}
