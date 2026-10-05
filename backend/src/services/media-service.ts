import { MediaRepository } from '../repositories/media-repository.js'
import { ReportRepository } from '../repositories/report-repository.js'
import type { MediaKind } from '../models/media.js'

export class MediaService {
  constructor(private readonly reports = new ReportRepository(), private readonly media = new MediaRepository()) {}

  async upload(userId: string, reportId: string, kind: MediaKind, file: Express.Multer.File) {
    const report = await this.reports.findForUser(reportId, userId)
    if (!report) return null
    return this.media.uploadReportImage({ userId, reportId, kind, file })
  }

  async signedUrl(userId: string, reportId: string, kind: MediaKind) {
    const report = await this.reports.findForUser(reportId, userId) as Record<string, unknown> | null
    if (!report) return null
    const path = report[kind === 'macro' ? 'macro_image_path' : 'inclusion_image_path']
    if (typeof path !== 'string' || !path) return { missing: true as const }
    return { signedUrl: await this.media.createSignedUrl(path) }
  }
}
