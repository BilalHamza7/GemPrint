export type GemstoneReport = {
  id: string
  user_id: string
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
  report_status?: 'draft' | 'ready'
  pdf_path?: string | null
  created_at: string
}

export type CreateReportInput = {
  serialNumber: string
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

export type FingerprintInput = {
  keypointCount: number
  fingerprintHash: string
  keypoints?: unknown[]
  metadata?: Record<string, unknown>
}
