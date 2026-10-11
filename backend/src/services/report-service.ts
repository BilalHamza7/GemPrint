import crypto from 'node:crypto'
import { ReportRepository } from '../repositories/report-repository.js'
import type { CreateReportInput, FingerprintInput, VerificationInput } from '../models/report.js'

export class ReportService {
  constructor(private readonly reports = new ReportRepository()) {}
  list(userId: string, includeArchived = false) {
    return this.reports.listForUser(userId, includeArchived)
  }
  get(id: string, userId: string) {
    return this.reports.findForUser(id, userId)
  }
  findBySerial(serialNumber: string, userId: string) {
    return this.reports.findBySerialForUser(serialNumber, userId)
  }
  async create(userId: string, input: CreateReportInput) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      const suffix = Array.from({ length: 5 }, () => alphabet[crypto.randomInt(alphabet.length)]).join('')
      const serialNumber = `GP-${suffix}`
      try {
        return await this.reports.create(userId, serialNumber, input)
      } catch (error) {
        if (!(error instanceof Error) || !/duplicate key|unique constraint/i.test(error.message)) throw error
      }
    }
    throw new Error('Could not allocate a unique report serial. Please retry.')
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

  createVerificationLog(input: VerificationInput) {
    return this.reports.createVerificationLog(input)
  }
}
