import type { Request, Response } from 'express'
import { DocumentService } from '../services/document-service.js'

const documents = new DocumentService()

function reportId(request: Request) {
  return Array.isArray(request.params.id) ? request.params.id[0] : request.params.id
}

export async function generateIdentificationReport(request: Request, response: Response) {
  try {
    const document = await documents.generate(request.user!.id, reportId(request))
    return document
      ? response.status(201).json({ document })
      : response.status(404).json({ error: 'Report not found.' })
  } catch (caught) {
    return response
      .status(400)
      .json({ error: caught instanceof Error ? caught.message : 'Unable to generate document.' })
  }
}

export async function getIdentificationReportUrl(request: Request, response: Response) {
  try {
    const result = await documents.signedUrl(request.user!.id, reportId(request))
    if (!result) return response.status(404).json({ error: 'Report not found.' })
    if ('missing' in result) return response.status(404).json({ error: 'Generate the document before downloading it.' })
    return response.json(result)
  } catch (caught) {
    return response.status(400).json({ error: caught instanceof Error ? caught.message : 'Unable to access document.' })
  }
}
