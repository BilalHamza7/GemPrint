import { getSupabaseAdminClient } from '../config/supabase.js'

const BUCKET = 'gem_print_media'

export class DocumentRepository {
  async uploadPdf(userId: string, reportId: string, pdf: Buffer) {
    const path = `${userId}/reports/${reportId}/documents/gem-identification-report.pdf`
    const { error } = await getSupabaseAdminClient()
      .storage.from(BUCKET)
      .upload(path, pdf, { contentType: 'application/pdf', upsert: true })
    if (error) throw new Error(error.message)
    return path
  }

  async downloadImage(path: string) {
    const { data, error } = await getSupabaseAdminClient().storage.from(BUCKET).download(path)
    if (error || !data) throw new Error(error?.message ?? 'Could not load report image.')
    return Buffer.from(await data.arrayBuffer())
  }

  async createSignedUrl(path: string) {
    const { data, error } = await getSupabaseAdminClient()
      .storage.from(BUCKET)
      .createSignedUrl(path, 60 * 10)
    if (error || !data) throw new Error(error?.message ?? 'Could not prepare document download.')
    return data.signedUrl
  }
}
