import crypto from 'node:crypto'
import { getSupabaseAdminClient } from '../config/supabase.js'
import type { CreateReportInput, FingerprintInput, GemstoneReport } from '../models/report.js'

export class ReportRepository {
  async listForLaboratory(laboratoryId: string, includeArchived = false) {
    let query = getSupabaseAdminClient()
      .from('gemstone_reports')
      .select('*')
      .eq('laboratory_id', laboratoryId)
      .order('created_at', { ascending: false })
    if (!includeArchived) query = query.is('archived_at', null)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []) as GemstoneReport[]
  }

  async findForLaboratory(id: string, laboratoryId: string) {
    const { data, error } = await getSupabaseAdminClient()
      .from('gemstone_reports')
      .select('*, fingerprint_data(*), verification_logs(*)')
      .eq('id', id)
      .eq('laboratory_id', laboratoryId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data
  }

  async create(userId: string, laboratoryId: string, input: CreateReportInput) {
    const { data, error } = await getSupabaseAdminClient()
      .from('gemstone_reports')
      .insert({
        user_id: userId,
        laboratory_id: laboratoryId,
        serial_number: input.serialNumber,
        issue_date: input.issueDate,
        species: input.species,
        variety: input.variety,
        carat_weight: input.caratWeight,
        colour: input.colour,
        cut_shape: input.cutShape,
        dimensions: input.dimensions,
        comments: input.comments ?? null,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data as GemstoneReport
  }

  async update(id: string, laboratoryId: string, input: Partial<CreateReportInput>) {
    const columns: Record<string, unknown> = {}
    const mapping: Record<string, string> = {
      serialNumber: 'serial_number',
      issueDate: 'issue_date',
      caratWeight: 'carat_weight',
      species: 'species',
      variety: 'variety',
      colour: 'colour',
      cutShape: 'cut_shape',
      dimensions: 'dimensions',
      comments: 'comments',
    }
    for (const [key, column] of Object.entries(mapping))
      if (key in input) columns[column] = input[key as keyof CreateReportInput] ?? null
    const { data, error } = await getSupabaseAdminClient()
      .from('gemstone_reports')
      .update(columns)
      .eq('id', id)
      .eq('laboratory_id', laboratoryId)
      .select()
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data as GemstoneReport | null
  }

  async setArchived(id: string, laboratoryId: string, archived: boolean) {
    const { data, error } = await getSupabaseAdminClient()
      .from('gemstone_reports')
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .eq('id', id)
      .eq('laboratory_id', laboratoryId)
      .select()
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data as GemstoneReport | null
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
}
