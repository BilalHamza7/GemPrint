import type { Request, Response } from 'express'
import { isMediaKind } from '../models/media.js'
import { MediaService } from '../services/media-service.js'
import { parseMicroscopicImageFrame } from '../models/microscopic-frame.js'

const media = new MediaService()
function routeValue(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

export async function uploadReportImage(request: Request, response: Response) {
  const id = routeValue(request.params.id)
  const kind = routeValue(request.params.kind)
  if (!isMediaKind(kind)) return response.status(400).json({ error: 'Image kind must be macro or inclusion.' })
  if (!request.file) return response.status(400).json({ error: 'Attach one JPEG or PNG image using the image field.' })
  try {
    const frame = kind === 'inclusion' ? parseMicroscopicImageFrame(request.body.frame) : undefined
    const uploaded = await media.upload(request.user!.id, id, kind, request.file, frame)
    return uploaded
      ? response.status(201).json({ media: uploaded })
      : response.status(404).json({ error: 'Report not found.' })
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Unable to upload image.'
    if (message.includes('fingerprint processing service is unavailable')) {
      return response.status(503).json({
        error: 'Fingerprint processing is waking up. Wait a moment, then retry the reference image upload.',
      })
    }
    return response.status(400).json({ error: message })
  }
}

export async function getReportImageUrl(request: Request, response: Response) {
  const id = routeValue(request.params.id)
  const kind = routeValue(request.params.kind)
  if (!isMediaKind(kind)) return response.status(400).json({ error: 'Image kind must be macro or inclusion.' })
  try {
    const result = await media.signedUrl(request.user!.id, id, kind)
    if (!result) return response.status(404).json({ error: 'Report not found.' })
    if ('missing' in result) return response.status(404).json({ error: 'No image of this type has been uploaded.' })
    return response.json(result)
  } catch (caught) {
    return response.status(400).json({ error: caught instanceof Error ? caught.message : 'Unable to access image.' })
  }
}

export async function deleteReportImage(request: Request, response: Response) {
  const id = routeValue(request.params.id)
  const kind = routeValue(request.params.kind)
  if (!isMediaKind(kind))
    return response.status(400).json({ error: 'Image kind must be main or fingerprint reference.' })
  try {
    const result = await media.remove(request.user!.id, id, kind)
    if (!result) return response.status(404).json({ error: 'Report not found.' })
    if ('missing' in result) return response.status(404).json({ error: 'No image of this type has been uploaded.' })
    return response.status(204).send()
  } catch (caught) {
    return response.status(400).json({ error: caught instanceof Error ? caught.message : 'Unable to delete image.' })
  }
}
