import { describe, expect, it } from 'vitest'
import { validateCreateReport, validateUpdateReport } from './report-validator.js'

const baseReport = {
  serialNumber: 'GP-2026-001',
  issueDate: '2026-10-10',
  species: 'Natural Corundum',
  variety: 'Blue Sapphire',
  caratWeight: 2.14,
  colour: 'Blue',
  cutShape: 'Oval mixed cut',
  dimensions: '8.12 x 6.34 x 4.21 mm',
}

describe('report request validation', () => {
  it('accepts microscopic reference capture context during report registration', () => {
    expect(
      validateCreateReport({
        ...baseReport,
        microImageMagnification: '40x',
        microImageLighting: 'Darkfield LED',
        microImageMicroscope: 'Binocular gem microscope',
        microImageDevice: 'Smartphone camera',
        microImageAreaNotes: 'Crown, 10 o’clock',
        microImageCapturedOn: '2026-10-10',
        microImageCaptureNotes: 'Stable focus and no visible glare.',
      }),
    ).toMatchObject({
      microImageMagnification: '40x',
      microImageLighting: 'Darkfield LED',
      microImageDevice: 'Smartphone camera',
    })
  })

  it('allows optional capture context to be cleared through a report update', () => {
    expect(validateUpdateReport({ microImageLighting: '' })).toEqual({ microImageLighting: undefined })
  })
})
