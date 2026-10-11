import { env } from '../config/env.js'
import type { MicroscopicImageFrame } from '../models/microscopic-frame.js'

// Render free services can need more than 30 seconds to wake after inactivity.
const CV_REQUEST_TIMEOUT_MS = 90_000

export type ExtractionResult = {
  keypoint_count: number
  keypoints: unknown[]
  fingerprint_hash: string
  latency_ms: number
  quality: 'acceptable' | 'insufficient_features'
  quality_score: number
  reference_image_sha256: string
  preprocessing_metadata: Record<string, unknown>
  algorithm_version: string
  descriptor_npy_base64: string
  roi_image_png_base64: string
  roi_metadata: Record<string, unknown>
}

export type VerificationResult = {
  verdict: 'verified' | 'not_verified' | 'inconclusive'
  reason?: string
  good_match_count?: number
  inlier_count?: number
  inlier_ratio?: number
  confidence_score?: number
  quality_score?: number
  query_image_sha256?: string
  reference_image_sha256?: string
  latency_ms: number
  algorithm_version?: string
  match_proof_base64?: string
  query_roi_png_base64?: string
  query_roi_metadata?: Record<string, unknown>
}

/** The browser never calls FastAPI: this service is the authenticated internal bridge. */
export class CvService {
  private readonly baseUrl = env.CV_SERVICE_URL.replace(/\/+$/, '')

  async extractReference(image: Buffer, contentType: string, frame: MicroscopicImageFrame) {
    return this.post<ExtractionResult>(
      '/extract-fingerprint',
      {
        image: { bytes: image, contentType, filename: 'reference-image' },
      },
      { frame_json: JSON.stringify(frame) },
    )
  }

  async verify(input: {
    query: Buffer
    queryContentType: string
    reference: Buffer
    referenceContentType: string
    referenceDescriptors: Buffer
    referenceKeypoints: unknown[]
    queryFrame: MicroscopicImageFrame
  }) {
    return this.post<VerificationResult>(
      '/verify-fingerprint',
      {
        query: { bytes: input.query, contentType: input.queryContentType, filename: 'query-image' },
        reference: { bytes: input.reference, contentType: input.referenceContentType, filename: 'reference-image' },
        referenceDescriptors: {
          bytes: input.referenceDescriptors,
          contentType: 'application/octet-stream',
          filename: 'reference-descriptors.npy',
        },
      },
      {
        reference_keypoints_json: JSON.stringify(input.referenceKeypoints),
        query_frame_json: JSON.stringify(input.queryFrame),
      },
    )
  }

  private async post<T>(
    path: string,
    files: Record<string, { bytes: Buffer; contentType: string; filename: string }>,
    fields: Record<string, string> = {},
  ) {
    const form = new FormData()
    for (const [field, value] of Object.entries(fields)) form.append(field, value)
    for (const [field, file] of Object.entries(files)) {
      form.append(field, new Blob([Uint8Array.from(file.bytes)], { type: file.contentType }), file.filename)
    }
    let response: Response
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'X-Internal-Service-Key': env.CV_INTERNAL_SERVICE_KEY },
        body: form,
        signal: AbortSignal.timeout(CV_REQUEST_TIMEOUT_MS),
      })
    } catch {
      throw new Error('The fingerprint processing service is unavailable. Please try again shortly.')
    }
    const body = (await response.json().catch(() => ({}))) as { detail?: string } & T
    if (!response.ok) throw new Error(body.detail ?? 'Fingerprint processing failed.')
    return body as T
  }
}
