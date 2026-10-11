import type { Request, Response } from 'express'
import { VerificationService } from '../services/verification-service.js'

const verification = new VerificationService()

export async function verifyReport(request: Request, response: Response) {
  const reportId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id
  if (!request.file)
    return response.status(400).json({ error: 'Attach one JPEG or PNG query image using the image field.' })
  try {
    const verificationResult = await verification.verify(request.user!.id, reportId, request.file)
    return verificationResult
      ? response.status(201).json({ verification: verificationResult })
      : response.status(404).json({ error: 'Report not found.' })
  } catch (caught) {
    return response
      .status(400)
      .json({ error: caught instanceof Error ? caught.message : 'Verification could not be completed.' })
  }
}
