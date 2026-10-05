import { api } from '../../../lib/supabase'
import type { CreateReportInput, GemstoneReport, ReportDetail } from '../types/report'

export async function listReports(): Promise<GemstoneReport[]> { return (await api<{ reports: GemstoneReport[] }>('/api/reports')).reports }
export async function createReport(input: CreateReportInput): Promise<GemstoneReport> { return (await api<{ report: GemstoneReport }>('/api/reports', { method: 'POST', body: JSON.stringify(input) })).report }
export async function getReport(id: string): Promise<ReportDetail> { return (await api<{ report: ReportDetail }>(`/api/reports/${id}`)).report }
export async function updateReport(id: string, input: Partial<CreateReportInput>): Promise<GemstoneReport> { return (await api<{ report: GemstoneReport }>(`/api/reports/${id}`, { method: 'PATCH', body: JSON.stringify(input) })).report }
export type MediaKind = 'macro' | 'inclusion'
export async function uploadReportImage(id: string, kind: MediaKind, file: File) { const body = new FormData(); body.append('image', file); return api<{ media: { path: string } }>(`/api/reports/${id}/media/${kind}`, { method: 'POST', body }) }
export async function getReportImageUrl(id: string, kind: MediaKind) { return api<{ signedUrl: string }>(`/api/reports/${id}/media/${kind}`) }
