import type { Request, Response } from 'express'
import { VerificationService } from '../services/verification-service.js'
import { parseMicroscopicImageFrame } from '../models/microscopic-frame.js'

const verification = new VerificationService()

export async function verifyReport(request: Request, response: Response) {
  const reportId = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id
  if (!request.file)
    return response.status(400).json({ error: 'Attach one JPEG or PNG query image using the image field.' })
  try {
    const queryFrame = parseMicroscopicImageFrame(request.body.frame)
    const verificationResult = await verification.verify(request.user!.id, reportId, request.file, queryFrame)
    return verificationResult
      ? response.status(201).json({ verification: verificationResult })
      : response.status(404).json({ error: 'Report not found.' })
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Verification could not be completed.'
    if (
      message.includes('fingerprint processing service is unavailable')
      || message.includes('fingerprint processing is temporarily busy')
    ) {
      return response
        .status(503)
        .json({ error: 'Fingerprint processing is temporarily unavailable. Wait a moment, then retry verification.' })
    }
    return response.status(400).json({ error: message })
  }
}
