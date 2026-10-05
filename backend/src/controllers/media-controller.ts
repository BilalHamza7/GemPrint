import type { Request, Response } from 'express'
import { isMediaKind } from '../models/media.js'
import { MediaService } from '../services/media-service.js'

const media = new MediaService()
function routeValue(value: string | string[]) { return Array.isArray(value) ? value[0] : value }

export async function uploadReportImage(request: Request, response: Response) {
  const id = routeValue(request.params.id)
  const kind = routeValue(request.params.kind)
  if (!isMediaKind(kind)) return response.status(400).json({ error: 'Image kind must be macro or inclusion.' })
  if (!request.file) return response.status(400).json({ error: 'Attach one JPEG or PNG image using the image field.' })
  try {
    const uploaded = await media.upload(request.user!.laboratoryId, id, kind, request.file)
    return uploaded ? response.status(201).json({ media: uploaded }) : response.status(404).json({ error: 'Report not found.' })
  } catch (caught) {
    return response.status(400).json({ error: caught instanceof Error ? caught.message : 'Unable to upload image.' })
  }
}

export async function getReportImageUrl(request: Request, response: Response) {
  const id = routeValue(request.params.id)
  const kind = routeValue(request.params.kind)
  if (!isMediaKind(kind)) return response.status(400).json({ error: 'Image kind must be macro or inclusion.' })
  try {
    const result = await media.signedUrl(request.user!.laboratoryId, id, kind)
    if (!result) return response.status(404).json({ error: 'Report not found.' })
    if ('missing' in result) return response.status(404).json({ error: 'No image of this type has been uploaded.' })
    return response.json(result)
  } catch (caught) {
    return response.status(400).json({ error: caught instanceof Error ? caught.message : 'Unable to access image.' })
  }
}
