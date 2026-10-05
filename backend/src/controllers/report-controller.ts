import type { Request, Response } from 'express'
import { ReportService } from '../services/report-service.js'
import { validateCreateReport, validateFingerprint, validateUpdateReport } from '../validators/report-validator.js'

const reports = new ReportService()
function unavailable(response: Response) { return response.status(503).json({ error: 'Database is not configured or unavailable.' }) }

export async function listReports(request: Request, response: Response) {
  try { return response.json({ reports: await reports.list(request.user!.laboratoryId, request.query.includeArchived === 'true') }) } catch { return unavailable(response) }
}
export async function getReport(request: Request, response: Response) {
  const id = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id
  try { const report = await reports.get(id, request.user!.laboratoryId); return report ? response.json({ report }) : response.status(404).json({ error: 'Report not found.' }) } catch { return unavailable(response) }
}
export async function createReport(request: Request, response: Response) {
  const input = validateCreateReport(request.body)
  if (!input) return response.status(400).json({ error: 'Missing or invalid report fields.' })
  try { return response.status(201).json({ report: await reports.create(request.user!.id, request.user!.laboratoryId, input) }) } catch (caught) { return response.status(400).json({ error: caught instanceof Error ? caught.message : 'Unable to create report.' }) }
}
export async function updateReport(request: Request, response: Response) {
  const input = validateUpdateReport(request.body)
  if (!input) return response.status(400).json({ error: 'Provide at least one valid report field.' })
  const id = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id
  try { const report = await reports.update(id, request.user!.laboratoryId, input); return report ? response.json({ report }) : response.status(404).json({ error: 'Report not found.' }) } catch (caught) { return response.status(400).json({ error: caught instanceof Error ? caught.message : 'Unable to update report.' }) }
}
export async function archiveReport(request: Request, response: Response) {
  const id = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id
  const archived = request.path.endsWith('/archive')
  try { const report = await reports.archive(id, request.user!.laboratoryId, archived); return report ? response.json({ report }) : response.status(404).json({ error: 'Report not found.' }) } catch { return unavailable(response) }
}
export async function saveFingerprint(request: Request, response: Response) {
  const input = validateFingerprint(request.body)
  if (!input) return response.status(400).json({ error: 'Invalid fingerprint data.' })
  const id = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id
  try { const fingerprint = await reports.storeFingerprint(id, request.user!.laboratoryId, input); return fingerprint ? response.status(201).json({ fingerprint }) : response.status(404).json({ error: 'Report not found.' }) } catch (caught) { return response.status(400).json({ error: caught instanceof Error ? caught.message : 'Unable to save fingerprint.' }) }
}
