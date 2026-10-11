import { CvService } from './cv-service.js'
import { MediaRepository } from '../repositories/media-repository.js'
import { ReportRepository } from '../repositories/report-repository.js'
import { ReportService } from './report-service.js'

export class VerificationService {
  constructor(
    private readonly reports = new ReportRepository(),
    private readonly media = new MediaRepository(),
    private readonly cv = new CvService(),
    private readonly reportService = new ReportService(),
  ) {}

  async verify(userId: string, reportId: string, query: Express.Multer.File) {
    const report = (await this.reports.findForUser(reportId, userId)) as Record<string, unknown> | null
    if (!report) return null
    const referencePath = report.inclusion_image_path
    if (typeof referencePath !== 'string' || !referencePath) {
      throw new Error('This report does not have a microscopic reference image.')
    }

    const reference = await this.media.download(referencePath)
    const result = await this.cv.verify(
      query.buffer,
      query.mimetype,
      reference,
      this.media.contentTypeForPath(referencePath),
    )
    const queryImagePath = await this.media.uploadVerificationArtifact({
      userId,
      reportId,
      kind: 'query',
      bytes: query.buffer,
      contentType: query.mimetype,
    })
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
