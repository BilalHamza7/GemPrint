import { Router } from 'express'
import { requireAuth } from '../middleware/require-auth.js'
import {
  archiveReport,
  createReport,
  getReport,
  listReports,
  saveFingerprint,
  updateReport,
} from '../controllers/report-controller.js'
import { getReportImageUrl, uploadReportImage } from '../controllers/media-controller.js'
import { imageUpload } from '../middleware/image-upload.js'

export const reportsRouter = Router()
reportsRouter.use(requireAuth)
reportsRouter.get('/', listReports)
reportsRouter.get('/:id', getReport)
reportsRouter.post('/', createReport)
reportsRouter.patch('/:id', updateReport)
reportsRouter.post('/:id/archive', archiveReport)
reportsRouter.post('/:id/restore', archiveReport)
reportsRouter.post('/:id/fingerprint', saveFingerprint)
reportsRouter.post('/:id/media/:kind', imageUpload.single('image'), uploadReportImage)
reportsRouter.get('/:id/media/:kind', getReportImageUrl)
