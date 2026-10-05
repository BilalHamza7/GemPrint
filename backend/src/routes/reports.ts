import { Router } from 'express'
import { requireAuth } from '../middleware/require-auth.js'
import { createReport, getReport, listReports, saveFingerprint } from '../controllers/report-controller.js'

export const reportsRouter = Router()
reportsRouter.use(requireAuth)
reportsRouter.get('/', listReports)
reportsRouter.get('/:id', getReport)
reportsRouter.post('/', createReport)
reportsRouter.post('/:id/fingerprint', saveFingerprint)
