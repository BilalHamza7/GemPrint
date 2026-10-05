import { ReportRepository } from '../repositories/report-repository.js'
import type { CreateReportInput, FingerprintInput } from '../models/report.js'

export class ReportService {
  constructor(private readonly reports = new ReportRepository()) {}
  list(userId: string, includeArchived = false) {
    return this.reports.listForUser(userId, includeArchived)
  }
  get(id: string, userId: string) {
    return this.reports.findForUser(id, userId)
  }
  create(userId: string, input: CreateReportInput) {
    return this.reports.create(userId, input)
  }
  update(id: string, userId: string, input: Partial<CreateReportInput>) {
    return this.reports.update(id, userId, input)
  }
  archive(id: string, userId: string, archived: boolean) {
    return this.reports.setArchived(id, userId, archived)
  }
  async storeFingerprint(id: string, userId: string, input: FingerprintInput) {
    const report = await this.reports.findForUser(id, userId)
    if (!report) return null
    return this.reports.saveFingerprint(id, input)
  }
}
