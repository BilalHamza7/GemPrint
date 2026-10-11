import { MediaRepository } from '../repositories/media-repository.js'
import { ReportRepository } from '../repositories/report-repository.js'
import type { MediaKind } from '../models/media.js'
import type { MicroscopicImageFrame } from '../models/microscopic-frame.js'
import { CvService } from './cv-service.js'

export class MediaService {
  constructor(
    private readonly reports = new ReportRepository(),
    private readonly media = new MediaRepository(),
    private readonly cv = new CvService(),
  ) {}

  async upload(
    userId: string,
    reportId: string,
    kind: MediaKind,
    file: Express.Multer.File,
    frame?: MicroscopicImageFrame,
  ) {
    const report = await this.reports.findForUser(reportId, userId)
    if (!report) return null
    const extraction = kind === 'inclusion' ? await this.cv.extractReference(file.buffer, file.mimetype, frame!) : null
    if (extraction) {
      if (extraction.quality !== 'acceptable')
        throw new Error('The microscopic reference image has insufficient visible features. Upload a clearer image.')
    }

    const uploaded = await this.media.uploadReportImage({ userId, reportId, kind, file })
    if (extraction) {
      const descriptorStorageReference = await this.media.uploadReferenceDescriptors({
        userId,
        reportId,
        bytes: Buffer.from(extraction.descriptor_npy_base64, 'base64'),
      })
      const referenceRoiPath = await this.media.uploadReferenceRoi({
        userId,
        reportId,
        bytes: Buffer.from(extraction.roi_image_png_base64, 'base64'),
      })
      await this.reports.saveFingerprint(reportId, {
        keypointCount: extraction.keypoint_count,
        fingerprintHash: extraction.fingerprint_hash,
        keypoints: extraction.keypoints,
        metadata: {
          latency_ms: extraction.latency_ms,
          capture_frame: frame,
          reference_roi_path: referenceRoiPath,
          reference_roi_metadata: extraction.roi_metadata,
        },
        algorithmVersion: extraction.algorithm_version,
        qualityScore: extraction.quality_score,
        referenceImageSha256: extraction.reference_image_sha256,
        preprocessingMetadata: extraction.preprocessing_metadata,
        descriptorStorageReference,
      })
    }
    return uploaded
  }

  async signedUrl(userId: string, reportId: string, kind: MediaKind) {
    const report = (await this.reports.findForUser(reportId, userId)) as Record<string, unknown> | null
    if (!report) return null
    const path = report[kind === 'macro' ? 'macro_image_path' : 'inclusion_image_path']
    if (typeof path !== 'string' || !path) return { missing: true as const }
    return { signedUrl: await this.media.createSignedUrl(path) }
  }

  async remove(userId: string, reportId: string, kind: MediaKind) {
    const report = (await this.reports.findForUser(reportId, userId)) as Record<string, unknown> | null
    if (!report) return null
    const path = report[kind === 'macro' ? 'macro_image_path' : 'inclusion_image_path']
    if (typeof path !== 'string' || !path) return { missing: true as const }
    await this.media.deleteReportImage({ userId, reportId, kind, path })
    return { removed: true as const }
  }
}
