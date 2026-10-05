import crypto from 'node:crypto'
import { getSupabaseAdminClient } from '../config/supabase.js'
import type { MediaKind } from '../models/media.js'

const BUCKET = 'gem_print_media'
const extensionByMimeType: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png' }

export class MediaRepository {
  async uploadReportImage(input: { userId: string; reportId: string; kind: MediaKind; file: Express.Multer.File }) {
    const extension = extensionByMimeType[input.file.mimetype]
    if (!extension) throw new Error('Only JPEG and PNG images are supported.')
    const path = `${input.userId}/reports/${input.reportId}/${input.kind}/${crypto.randomUUID()}.${extension}`
    const client = getSupabaseAdminClient()
    const { error } = await client.storage
      .from(BUCKET)
      .upload(path, input.file.buffer, { contentType: input.file.mimetype, upsert: false })
    if (error) throw new Error(error.message)
    const column = input.kind === 'macro' ? 'macro_image_path' : 'inclusion_image_path'
    const { error: reportError } = await client
      .from('gemstone_reports')
      .update({ [column]: path })
      .eq('id', input.reportId)
      .eq('user_id', input.userId)
    if (reportError) {
      await client.storage.from(BUCKET).remove([path])
      throw new Error(reportError.message)
    }
    return { path, contentType: input.file.mimetype, size: input.file.size }
  }

  async createSignedUrl(path: string) {
    const { data, error } = await getSupabaseAdminClient()
      .storage.from(BUCKET)
      .createSignedUrl(path, 60 * 10)
    if (error || !data) throw new Error(error?.message ?? 'Could not prepare image access.')
    return data.signedUrl
  }
}
