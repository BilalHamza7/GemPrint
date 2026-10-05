import type { CreateReportInput, FingerprintInput } from '../models/report.js'

function text(value: unknown, required = true) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return required && !trimmed ? null : trimmed
}

/** Plain request validation keeps HTTP input checks separate from database operations. */
export function validateCreateReport(body: unknown): CreateReportInput | null {
  if (!body || typeof body !== 'object') return null
  const value = body as Record<string, unknown>
  const serialNumber = text(value.serialNumber)
  const issueDate = text(value.issueDate)
  const species = text(value.species)
  const variety = text(value.variety)
  const colour = text(value.colour)
  const cutShape = text(value.cutShape)
  const dimensions = text(value.dimensions)
  const caratWeight = value.caratWeight
  const comments = text(value.comments, false)
  if (!serialNumber || !issueDate || !species || !variety || !colour || !cutShape || !dimensions || typeof caratWeight !== 'number' || !Number.isFinite(caratWeight) || caratWeight <= 0) return null
  return { serialNumber, issueDate, species, variety, caratWeight, colour, cutShape, dimensions, comments: comments || undefined }
}

export function validateFingerprint(body: unknown): FingerprintInput | null {
  if (!body || typeof body !== 'object') return null
  const value = body as Record<string, unknown>
  if (typeof value.keypointCount !== 'number' || !Number.isInteger(value.keypointCount) || value.keypointCount < 0 || typeof value.fingerprintHash !== 'string' || !value.fingerprintHash.trim()) return null
  return { keypointCount: value.keypointCount, fingerprintHash: value.fingerprintHash.trim(), keypoints: Array.isArray(value.keypoints) ? value.keypoints : [], metadata: value.metadata && typeof value.metadata === 'object' && !Array.isArray(value.metadata) ? value.metadata as Record<string, unknown> : {} }
}
