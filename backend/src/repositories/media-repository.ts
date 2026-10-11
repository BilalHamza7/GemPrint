import crypto from 'node:crypto'
import { getSupabaseAdminClient } from '../config/supabase.js'
import type { MediaKind } from '../models/media.js'

const BUCKET = 'gem_print_media'
const extensionByMimeType: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png' }

export class MediaRepository {
  async download(path: string) {
    const { data, error } = await getSupabaseAdminClient().storage.from(BUCKET).download(path)
    if (error || !data) throw new Error(error?.message ?? 'Could not load the stored microscopic reference image.')
    return Buffer.from(await data.arrayBuffer())
  }

  contentTypeForPath(path: string) {
    return path.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
  }

  async uploadReferenceDescriptors(input: { userId: string; reportId: string; bytes: Buffer }) {
    const path = `${input.userId}/reports/${input.reportId}/fingerprints/reference-descriptors.npy`
    const { error } = await getSupabaseAdminClient()
      .storage.from(BUCKET)
      .upload(path, input.bytes, { contentType: 'application/octet-stream', upsert: true })
    if (error) throw new Error(error.message)
    return path
  }

  async uploadVerificationArtifact(input: {
    userId: string
    reportId: string
    kind: 'query' | 'match-proof'
    bytes: Buffer
    contentType: string
  }) {
    const extension = extensionByMimeType[input.contentType]
    if (!extension) throw new Error('Unsupported verification image type.')
    const path = `${input.userId}/reports/${input.reportId}/verifications/${crypto.randomUUID()}-${input.kind}.${extension}`
    const { error } = await getSupabaseAdminClient()
      .storage.from(BUCKET)
      .upload(path, input.bytes, { contentType: input.contentType, upsert: false })
    if (error) throw new Error(error.message)
    return path
  }

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
    const { data: current, error: currentError } = await client
      .from('gemstone_reports')
      .select(column)
      .eq('id', input.reportId)
      .eq('user_id', input.userId)
      .maybeSingle()
    if (currentError) {
      await client.storage.from(BUCKET).remove([path])
      throw new Error(currentError.message)
    }
    const { error: reportError } = await client
      .from('gemstone_reports')
      .update({ [column]: path })
      .eq('id', input.reportId)
      .eq('user_id', input.userId)
    if (reportError) {
      await client.storage.from(BUCKET).remove([path])
      throw new Error(reportError.message)
    }
    const previousPath = (current as Record<string, unknown> | null)?.[column]
    if (typeof previousPath === 'string' && previousPath && previousPath !== path)
      await client.storage.from(BUCKET).remove([previousPath])
    return { path, contentType: input.file.mimetype, size: input.file.size }
  }

  async deleteReportImage(input: { userId: string; reportId: string; kind: MediaKind; path: string }) {
    const column = input.kind === 'macro' ? 'macro_image_path' : 'inclusion_image_path'
    const client = getSupabaseAdminClient()
    const { error: reportError } = await client
      .from('gemstone_reports')
      .update({ [column]: null })
      .eq('id', input.reportId)
      .eq('user_id', input.userId)
    if (reportError) throw new Error(reportError.message)
    const { error: storageError } = await client.storage.from(BUCKET).remove([input.path])
    if (storageError) {
      await client
        .from('gemstone_reports')
        .update({ [column]: input.path })
        .eq('id', input.reportId)
        .eq('user_id', input.userId)
      throw new Error(storageError.message)
    }
  }

  async createSignedUrl(path: string) {
    const { data, error } = await getSupabaseAdminClient()
      .storage.from(BUCKET)
      .createSignedUrl(path, 60 * 10)
    if (error || !data) throw new Error(error?.message ?? 'Could not prepare image access.')
    return data.signedUrl
  }
}
