import { ReportRepository } from '../repositories/report-repository.js'
import type { CreateReportInput, FingerprintInput } from '../models/report.js'

export class ReportService {
  constructor(private readonly reports = new ReportRepository()) {}
  list(laboratoryId: string, includeArchived = false) { return this.reports.listForLaboratory(laboratoryId, includeArchived) }
  get(id: string, laboratoryId: string) { return this.reports.findForLaboratory(id, laboratoryId) }
  create(userId: string, laboratoryId: string, input: CreateReportInput) { return this.reports.create(userId, laboratoryId, input) }
  update(id: string, laboratoryId: string, input: Partial<CreateReportInput>) { return this.reports.update(id, laboratoryId, input) }
  archive(id: string, laboratoryId: string, archived: boolean) { return this.reports.setArchived(id, laboratoryId, archived) }
  async storeFingerprint(id: string, laboratoryId: string, input: FingerprintInput) {
    const report = await this.reports.findForLaboratory(id, laboratoryId)
    if (!report) return null
    return this.reports.saveFingerprint(id, input)
  }
}
