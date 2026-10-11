export type GemstoneReport = {
  id: string
  serial_number: string
  issue_date: string
  species: string
  variety: string
  carat_weight: number
  colour: string
  cut_shape: string
  dimensions: string
  comments: string | null
  micro_image_magnification: string | null
  micro_image_lighting: string | null
  micro_image_microscope: string | null
  micro_image_device: string | null
  micro_image_area_notes: string | null
  micro_image_captured_on: string | null
  micro_image_capture_notes: string | null
  fingerprint_hash: string | null
  report_status: 'draft' | 'ready'
  pdf_path: string | null
  created_at: string
}
export type CreateReportInput = {
  issueDate: string
  species: string
  variety: string
  caratWeight: number
  colour: string
  cutShape: string
  dimensions: string
  comments?: string
  microImageMagnification?: string
  microImageLighting?: string
  microImageMicroscope?: string
  microImageDevice?: string
  microImageAreaNotes?: string
  microImageCapturedOn?: string
  microImageCaptureNotes?: string
}
export type ReportDetail = GemstoneReport & {
  macro_image_path: string | null
  inclusion_image_path: string | null
  fingerprint_data: unknown[]
  verification_logs: unknown[]
}
