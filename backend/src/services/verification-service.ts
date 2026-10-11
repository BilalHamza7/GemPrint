import { CvService } from './cv-service.js'
import { MediaRepository } from '../repositories/media-repository.js'
import { ReportRepository } from '../repositories/report-repository.js'
import { ReportService } from './report-service.js'
import type { MicroscopicImageFrame } from '../models/microscopic-frame.js'

export class VerificationService {
  constructor(
    private readonly reports = new ReportRepository(),
    private readonly media = new MediaRepository(),
    private readonly cv = new CvService(),
    private readonly reportService = new ReportService(),
  ) {}

  async verify(userId: string, reportId: string, query: Express.Multer.File, queryFrame: MicroscopicImageFrame) {
    const report = (await this.reports.findForUser(reportId, userId)) as Record<string, unknown> | null
    if (!report) return null
    const referencePath = report.inclusion_image_path
    if (typeof referencePath !== 'string' || !referencePath) {
      throw new Error('This report does not have a microscopic reference image.')
    }
    // PostgREST can represent a unique embedded relationship as either an
    // object or a one-item array, depending on the generated relationship.
    const fingerprint = Array.isArray(report.fingerprint_data) ? report.fingerprint_data[0] : report.fingerprint_data
    if (!fingerprint || typeof fingerprint !== 'object') {
      throw new Error('This report does not have enrolled fingerprint data. Upload the reference image again.')
    }
    const fingerprintData = fingerprint as Record<string, unknown>
    const descriptorPath = fingerprintData.descriptor_storage_reference
    const keypoints = fingerprintData.keypoint_metadata_json
    if (typeof descriptorPath !== 'string' || !Array.isArray(keypoints)) {
      throw new Error('The enrolled fingerprint is incomplete. Upload the reference image again.')
    }

    const reference = await this.media.download(referencePath)
    const result = await this.cv.verify({
      query: query.buffer,
      queryContentType: query.mimetype,
      reference,
      referenceContentType: this.media.contentTypeForPath(referencePath),
      referenceDescriptors: await this.media.download(descriptorPath),
      referenceKeypoints: keypoints,
      queryFrame,
    })
    const queryImagePath = await this.media.uploadVerificationArtifact({
      userId,
      reportId,
      kind: 'query',
      bytes: query.buffer,
      contentType: query.mimetype,
    })
    if (result.query_roi_png_base64) {
      await this.media.uploadVerificationArtifact({
        userId,
        reportId,
        kind: 'query-roi',
        bytes: Buffer.from(result.query_roi_png_base64, 'base64'),
        contentType: 'image/png',
      })
    }
    const resultVisualPath = result.match_proof_base64
      ? await this.media.uploadVerificationArtifact({
          userId,
          reportId,
          kind: 'match-proof',
          bytes: Buffer.from(result.match_proof_base64, 'base64'),
          contentType: 'image/png',
        })
      : null
    const log = await this.reportService.createVerificationLog({
      reportId,
      userId,
      verdict: result.verdict,
      reason: result.reason,
      goodMatchCount: result.good_match_count,
      inlierCount: result.inlier_count,
      inlierRatio: result.inlier_ratio,
      qualityScore: result.quality_score,
      queryImagePath,
      resultVisualPath,
      queryImageSha256: result.query_image_sha256,
      referenceImageSha256: result.reference_image_sha256,
      // The audit column stores whole milliseconds. Keep the CV response
      // precise for the client, but persist its nearest millisecond safely.
      latencyMs: Math.round(result.latency_ms),
      algorithmVersion: result.algorithm_version,
    })
    return { result: { ...result, match_proof_base64: undefined }, log }
  }
}
