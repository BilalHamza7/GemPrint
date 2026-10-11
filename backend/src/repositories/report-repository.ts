import crypto from 'node:crypto'
import { getSupabaseAdminClient } from '../config/supabase.js'
import type { CreateReportInput, FingerprintInput, GemstoneReport, VerificationInput } from '../models/report.js'

export class ReportRepository {
  async listForUser(userId: string, includeArchived = false) {
    let query = getSupabaseAdminClient()
      .from('gemstone_reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (!includeArchived) query = query.is('archived_at', null)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []) as GemstoneReport[]
  }

  async findForUser(id: string, userId: string) {
    const { data, error } = await getSupabaseAdminClient()
      .from('gemstone_reports')
      .select('*, fingerprint_data(*), verification_logs(*)')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data
  }

  async create(userId: string, serialNumber: string, input: CreateReportInput) {
    const { data, error } = await getSupabaseAdminClient()
      .from('gemstone_reports')
      .insert({
        user_id: userId,
        serial_number: serialNumber,
        issue_date: input.issueDate,
        species: input.species,
        variety: input.variety,
        carat_weight: input.caratWeight,
        colour: input.colour,
        cut_shape: input.cutShape,
        dimensions: input.dimensions,
        comments: input.comments ?? null,
        micro_image_magnification: input.microImageMagnification ?? null,
        micro_image_lighting: input.microImageLighting ?? null,
        micro_image_microscope: input.microImageMicroscope ?? null,
        micro_image_device: input.microImageDevice ?? null,
        micro_image_area_notes: input.microImageAreaNotes ?? null,
        micro_image_captured_on: input.microImageCapturedOn ?? null,
        micro_image_capture_notes: input.microImageCaptureNotes ?? null,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data as GemstoneReport
  }

  async update(id: string, userId: string, input: Partial<CreateReportInput>) {
    const columns: Record<string, unknown> = {}
    const mapping: Record<string, string> = {
      issueDate: 'issue_date',
      caratWeight: 'carat_weight',
      species: 'species',
      variety: 'variety',
      colour: 'colour',
      cutShape: 'cut_shape',
      dimensions: 'dimensions',
      comments: 'comments',
      microImageMagnification: 'micro_image_magnification',
      microImageLighting: 'micro_image_lighting',
      microImageMicroscope: 'micro_image_microscope',
      microImageDevice: 'micro_image_device',
      microImageAreaNotes: 'micro_image_area_notes',
      microImageCapturedOn: 'micro_image_captured_on',
      microImageCaptureNotes: 'micro_image_capture_notes',
    }
    for (const [key, column] of Object.entries(mapping))
      if (key in input) columns[column] = input[key as keyof CreateReportInput] ?? null
    const { data, error } = await getSupabaseAdminClient()
      .from('gemstone_reports')
      .update(columns)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data as GemstoneReport | null
  }

  async findBySerialForUser(serialNumber: string, userId: string) {
    const { data, error } = await getSupabaseAdminClient()
      .from('gemstone_reports')
      .select(
        'id, serial_number, species, variety, fingerprint_hash, inclusion_image_path, micro_image_magnification, micro_image_lighting, micro_image_microscope, micro_image_device, micro_image_area_notes, micro_image_captured_on, micro_image_capture_notes',
      )
      .eq('user_id', userId)
      .ilike('serial_number', serialNumber.trim())
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data
  }

  async setArchived(id: string, userId: string, archived: boolean) {
    const { data, error } = await getSupabaseAdminClient()
      .from('gemstone_reports')
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data as GemstoneReport | null
  }

  async setDocumentPath(id: string, userId: string, path: string) {
    const { error } = await getSupabaseAdminClient()
      .from('gemstone_reports')
      .update({ pdf_path: path, report_status: 'ready' })
      .eq('id', id)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
  }

  async saveFingerprint(reportId: string, input: FingerprintInput) {
    const client = getSupabaseAdminClient()
    const { data, error } = await client
      .from('fingerprint_data')
      .upsert(
        {
          id: crypto.randomUUID(),
          gemstone_report_id: reportId,
          keypoint_count: input.keypointCount,
          keypoint_metadata_json: input.keypoints ?? [],
          fingerprint_metadata_json: input.metadata ?? {},
          algorithm_version: input.algorithmVersion ?? 'sift-clahe-v1',
          quality_score: input.qualityScore ?? null,
          reference_image_sha256: input.referenceImageSha256 ?? null,
          preprocessing_metadata_json: input.preprocessingMetadata ?? {},
          descriptor_storage_reference: input.descriptorStorageReference ?? null,
        },
        { onConflict: 'gemstone_report_id' },
      )
      .select()
      .single()
    if (error) throw new Error(error.message)
    const { error: updateError } = await client
      .from('gemstone_reports')
      .update({ fingerprint_hash: input.fingerprintHash })
      .eq('id', reportId)
    if (updateError) throw new Error(updateError.message)
    return data
  }

  async createVerificationLog(input: VerificationInput) {
    const { data, error } = await getSupabaseAdminClient()
      .from('verification_logs')
      .insert({
        user_id: input.userId,
        matched_gemstone_report_id: input.reportId,
        verdict: input.verdict,
        reason: input.reason ?? null,
        good_match_count: input.goodMatchCount ?? null,
        inlier_count: input.inlierCount ?? null,
        inlier_ratio: input.inlierRatio ?? null,
        quality_score: input.qualityScore ?? null,
        query_image_path: input.queryImagePath,
        result_visual_path: input.resultVisualPath ?? null,
        query_image_sha256: input.queryImageSha256 ?? null,
        reference_image_sha256: input.referenceImageSha256 ?? null,
        latency_ms: input.latencyMs ?? null,
        algorithm_version: input.algorithmVersion ?? 'sift-clahe-v1',
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  }
}
