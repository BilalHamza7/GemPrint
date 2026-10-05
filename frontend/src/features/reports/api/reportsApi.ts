import { api } from '../../../lib/supabase'
import type { CreateReportInput, GemstoneReport } from '../types/report'

export async function listReports(): Promise<GemstoneReport[]> { return (await api<{ reports: GemstoneReport[] }>('/api/reports')).reports }
export async function createReport(input: CreateReportInput): Promise<GemstoneReport> { return (await api<{ report: GemstoneReport }>('/api/reports', { method: 'POST', body: JSON.stringify(input) })).report }
