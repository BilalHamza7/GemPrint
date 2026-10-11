import { env } from '../config/env.js'

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
}

/** The browser never calls FastAPI: this service is the authenticated internal bridge. */
export class CvService {
  private readonly baseUrl = env.CV_SERVICE_URL.replace(/\/+$/, '')

  async extractReference(image: Buffer, contentType: string) {
    return this.post<ExtractionResult>('/extract-fingerprint', {
      image: { bytes: image, contentType, filename: 'reference-image' },
    })
  }

  async verify(query: Buffer, queryContentType: string, reference: Buffer, referenceContentType: string) {
    return this.post<VerificationResult>('/verify-fingerprint', {
      query: { bytes: query, contentType: queryContentType, filename: 'query-image' },
      reference: { bytes: reference, contentType: referenceContentType, filename: 'reference-image' },
    })
  }

  private async post<T>(path: string, files: Record<string, { bytes: Buffer; contentType: string; filename: string }>) {
    const form = new FormData()
    for (const [field, file] of Object.entries(files)) {
      form.append(field, new Blob([Uint8Array.from(file.bytes)], { type: file.contentType }), file.filename)
    }
    let response: Response
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'X-Internal-Service-Key': env.CV_INTERNAL_SERVICE_KEY },
        body: form,
        signal: AbortSignal.timeout(30_000),
      })
    } catch {
      throw new Error('The fingerprint processing service is unavailable. Please try again shortly.')
    }
    const body = (await response.json().catch(() => ({}))) as { detail?: string } & T
    if (!response.ok) throw new Error(body.detail ?? 'Fingerprint processing failed.')
    return body as T
  }
}
