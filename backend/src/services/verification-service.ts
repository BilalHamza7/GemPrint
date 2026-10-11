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
    const fingerprint = Array.isArray(report.fingerprint_data) ? report.fingerprint_data[0] : null
    if (!fingerprint || typeof fingerprint !== 'object') {
      throw new Error('This report does not have enrolled fingerprint data. Upload the reference image again.')
    }
    const fingerprintData = fingerprint as Record<string, unknown>
    const descriptorPath = fingerprintData.descriptor_storage_reference
    const keypoints = fingerprintData.keypoint_metadata_json
    const fingerprintMetadata = fingerprintData.fingerprint_metadata_json
    const referenceRoiPath =
      fingerprintMetadata && typeof fingerprintMetadata === 'object'
        ? (fingerprintMetadata as Record<string, unknown>).reference_roi_path
        : undefined
    if (typeof descriptorPath !== 'string' || !Array.isArray(keypoints) || typeof referenceRoiPath !== 'string') {
      throw new Error('The enrolled fingerprint is incomplete. Upload the reference image again.')
    }

    const reference = await this.media.download(referenceRoiPath)
    const result = await this.cv.verify({
      query: query.buffer,
      queryContentType: query.mimetype,
      reference,
      referenceContentType: 'image/png',
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
      latencyMs: result.latency_ms,
      algorithmVersion: result.algorithm_version,
    })
    return { result: { ...result, match_proof_base64: undefined }, log }
  }
}
