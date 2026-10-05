import PDFDocument from 'pdfkit'
import { DocumentRepository } from '../repositories/document-repository.js'
import { ProfileRepository } from '../repositories/profile-repository.js'
import { ReportRepository } from '../repositories/report-repository.js'

function renderPdf(write: (document: PDFKit.PDFDocument) => Promise<void>) {
  return new Promise<Buffer>((resolve, reject) => {
    const document = new PDFDocument({
      size: 'A4',
      margin: 48,
      info: { Title: 'Gem Identification Report', Author: 'GemPrint' },
    })
    const chunks: Buffer[] = []
    document.on('data', (chunk: Buffer) => chunks.push(chunk))
    document.on('end', () => resolve(Buffer.concat(chunks)))
    document.on('error', reject)
    void write(document)
      .then(() => document.end())
      .catch(reject)
  })
}

function valueOrDash(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '—'
}

export class DocumentService {
  constructor(
    private readonly reports = new ReportRepository(),
    private readonly profiles = new ProfileRepository(),
    private readonly documents = new DocumentRepository(),
  ) {}

  async generate(userId: string, reportId: string) {
    const report = (await this.reports.findForUser(reportId, userId)) as Record<string, unknown> | null
    if (!report) return null
    const profile = await this.profiles.findById(userId)
    if (!profile) throw new Error('Profile not found.')
    const pdf = await renderPdf(async (document) => {
      document.fillColor('#b88016').fontSize(10).text('GEMPRINT', { characterSpacing: 2 })
      document.fillColor('#171717').fontSize(24).text('Gem Identification Report', { continued: false })
      document
        .moveDown(0.5)
        .fillColor('#555555')
        .fontSize(9)
        .text(`Report serial: ${valueOrDash(report.serial_number)}`)
      document.text(`Issued: ${valueOrDash(report.issue_date)}`)
      document.moveDown()
      document.fillColor('#171717').fontSize(13).text('Issuing laboratory')
      document.fontSize(10).fillColor('#333333').text(valueOrDash(profile.laboratory_name))
      document.text(valueOrDash(profile.legal_business_name))
      if (profile.full_name) document.text(`Prepared by: ${profile.full_name}`)
      if (profile.business_registration_number) document.text(`Registration: ${profile.business_registration_number}`)
      document.text([profile.business_email, profile.business_phone].filter(Boolean).join('  ·  ') || '—')
      document.text([profile.address_line_1, profile.city, profile.country].filter(Boolean).join(', ') || '—')
      if (profile.website) document.text(profile.website)
      document.moveDown()
      const imagePath = report.macro_image_path
      if (typeof imagePath === 'string' && imagePath) {
        try {
          const image = await this.documents.downloadImage(imagePath)
          document.fillColor('#171717').fontSize(13).text('Gemstone image')
          document.moveDown(0.4).image(image, { fit: [490, 250], align: 'center' })
          document.moveDown()
        } catch {
          document
            .fillColor('#777777')
            .fontSize(9)
            .text('Main gemstone image could not be embedded at generation time.')
          document.moveDown()
        }
      }
      document.fillColor('#171717').fontSize(13).text('Gemstone details')
      const rows: Array<[string, unknown]> = [
        ['Species', report.species],
        ['Variety', report.variety],
        ['Weight', `${valueOrDash(report.carat_weight)} ct`],
        ['Colour', report.colour],
        ['Cut / shape', report.cut_shape],
        ['Dimensions', report.dimensions],
      ]
      for (const [label, value] of rows) {
        document.fontSize(9).fillColor('#777777').text(label)
        document.fontSize(11).fillColor('#222222').text(valueOrDash(value))
        document.moveDown(0.35)
      }
      document.moveDown(0.5).fillColor('#171717').fontSize(13).text('Observations')
      document.moveDown(0.3).fontSize(10).fillColor('#333333').text(valueOrDash(report.comments))
      document
        .moveDown(2)
        .fontSize(8)
        .fillColor('#777777')
        .text(
          'This report records the laboratory observations supplied at issuance. Fingerprint extraction and verification results are issued separately when available.',
          { align: 'center' },
        )
    })
    const path = await this.documents.uploadPdf(userId, reportId, pdf)
    await this.reports.setDocumentPath(reportId, userId, path)
    return { path }
  }

  async signedUrl(userId: string, reportId: string) {
    const report = (await this.reports.findForUser(reportId, userId)) as Record<string, unknown> | null
    if (!report) return null
    if (typeof report.pdf_path !== 'string' || !report.pdf_path) return { missing: true as const }
    return { signedUrl: await this.documents.createSignedUrl(report.pdf_path) }
  }
}
