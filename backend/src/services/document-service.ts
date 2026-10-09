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

function labelValue(document: PDFKit.PDFDocument, label: string, value: unknown, x: number, y: number, width: number) {
  document.fillColor('#777777').fontSize(8).text(label.toUpperCase(), x, y, { width })
  document
    .fillColor('#202020')
    .fontSize(10)
    .text(valueOrDash(value), x, y + 11, { width })
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
      const pageWidth = document.page.width
      const margin = document.page.margins.left
      const contentWidth = pageWidth - margin * 2
      const detailX = margin
      const imageX = margin + 315
      const imageWidth = 180

      document.rect(0, 0, pageWidth, 9).fill('#c18b2d')
      document.fillColor('#c18b2d').fontSize(10).text('GEMPRINT', margin, 34, { characterSpacing: 2.2 })
      document
        .fillColor('#181818')
        .fontSize(17)
        .text(valueOrDash(profile.laboratory_name), margin, 49, { width: 305, height: 36 })
      document
        .fillColor('#565656')
        .fontSize(9)
        .text(valueOrDash(profile.legal_business_name), margin, 91, { width: 305 })
      document
        .fontSize(8)
        .text([profile.business_email, profile.business_phone].filter(Boolean).join('  |  '), margin, 104, {
          width: 305,
        })
      document.text([profile.address_line_1, profile.city, profile.country].filter(Boolean).join(', '), margin, 115, {
        width: 305,
      })
      document
        .fillColor('#181818')
        .fontSize(14)
        .text('GEM IDENTIFICATION\nREPORT', imageX, 49, { width: imageWidth, align: 'right', lineGap: 1 })
      document
        .fillColor('#777777')
        .fontSize(8)
        .text('Private laboratory record', imageX, 84, { width: imageWidth, align: 'right' })
      document
        .moveTo(margin, 139)
        .lineTo(margin + contentWidth, 139)
        .lineWidth(0.8)
        .strokeColor('#d7d1c6')
        .stroke()

      labelValue(document, 'Report no.', report.serial_number, detailX, 155, 138)
      labelValue(document, 'Issue date', report.issue_date, detailX + 150, 155, 138)
      labelValue(document, 'Prepared by', profile.full_name, detailX, 192, 138)
      labelValue(document, 'Business registration', profile.business_registration_number, detailX + 150, 192, 138)

      const imagePath = report.macro_image_path
      document.rect(imageX, 152, imageWidth, 145).fillAndStroke('#f6f3ed', '#d7d1c6')
      if (typeof imagePath === 'string' && imagePath) {
        try {
          const image = await this.documents.downloadImage(imagePath)
          document.image(image, imageX + 8, 160, { fit: [imageWidth - 16, 126], align: 'center', valign: 'center' })
        } catch {
          document
            .fillColor('#777777')
            .fontSize(8)
            .text('Image unavailable', imageX, 218, { width: imageWidth, align: 'center' })
        }
      } else {
        document
          .fillColor('#777777')
          .fontSize(8)
          .text('Main gemstone image', imageX, 218, { width: imageWidth, align: 'center' })
      }
      document
        .fillColor('#777777')
        .fontSize(7)
        .text('Photograph is illustrative; colour and scale may vary.', imageX, 303, {
          width: imageWidth,
          align: 'center',
        })

      document.fillColor('#c18b2d').fontSize(10).text('GEMSTONE DETAILS', margin, 257, { characterSpacing: 1.2 })
      document
        .moveTo(margin, 275)
        .lineTo(margin + contentWidth, 275)
        .lineWidth(0.6)
        .strokeColor('#d7d1c6')
        .stroke()
      const rows: Array<[string, unknown]> = [
        ['Species', report.species],
        ['Variety', report.variety],
        ['Weight', `${valueOrDash(report.carat_weight)} ct`],
        ['Colour', report.colour],
        ['Cut / shape', report.cut_shape],
        ['Dimensions', report.dimensions],
      ]
      rows.forEach(([label, value], index) => {
        const rowY = 290 + index * 29
        document.fillColor('#777777').fontSize(8).text(label, detailX, rowY, { width: 130 })
        document
          .fillColor('#202020')
          .fontSize(10)
          .text(valueOrDash(value), detailX + 140, rowY, { width: 170 })
        document
          .moveTo(detailX, rowY + 20)
          .lineTo(detailX + 310, rowY + 20)
          .lineWidth(0.35)
          .strokeColor('#e2ddd4')
          .stroke()
      })

      const microImagePath = report.inclusion_image_path
      document.fillColor('#c18b2d').fontSize(8).text('MICROSCOPIC REFERENCE', imageX, 330, {
        width: imageWidth,
        characterSpacing: 0.9,
      })
      document.rect(imageX, 348, 82, 78).fillAndStroke('#f6f3ed', '#d7d1c6')
      if (typeof microImagePath === 'string' && microImagePath) {
        try {
          const image = await this.documents.downloadImage(microImagePath)
          document.image(image, imageX + 5, 353, { fit: [72, 68], align: 'center', valign: 'center' })
        } catch {
          document
            .fillColor('#777777')
            .fontSize(7)
            .text('Reference unavailable', imageX + 5, 383, { width: 72, align: 'center' })
        }
      } else {
        document
          .fillColor('#777777')
          .fontSize(7)
          .text('No reference image', imageX + 5, 383, { width: 72, align: 'center' })
      }
      const captureSummary = [
        ['Magnification', report.micro_image_magnification],
        ['Lighting', report.micro_image_lighting],
        ['Microscope', report.micro_image_microscope],
        ['Device', report.micro_image_device],
      ]
        .filter(([, value]) => typeof value === 'string' && value)
        .map(([label, value]) => `${label}: ${value}`)
      document
        .fillColor('#555555')
        .fontSize(7)
        .text(captureSummary.length ? captureSummary.join('\n') : 'Capture context not recorded.', imageX + 92, 350, {
          width: imageWidth - 92,
          lineGap: 2,
        })

      document.fillColor('#c18b2d').fontSize(10).text('LABORATORY OBSERVATIONS', margin, 478, { characterSpacing: 1.2 })
      document
        .moveTo(margin, 496)
        .lineTo(margin + contentWidth, 496)
        .lineWidth(0.6)
        .strokeColor('#d7d1c6')
        .stroke()
      document
        .fillColor('#333333')
        .fontSize(10)
        .text(valueOrDash(report.comments), margin, 510, { width: contentWidth, height: 70, lineGap: 2 })

      document
        .moveTo(margin, 604)
        .lineTo(margin + contentWidth, 604)
        .lineWidth(0.6)
        .strokeColor('#d7d1c6')
        .stroke()
      document.fillColor('#555555').fontSize(8).text('Issued by', margin, 616)
      document.fillColor('#202020').fontSize(10).text(valueOrDash(profile.full_name), margin, 628)
      document
        .fillColor('#555555')
        .fontSize(8)
        .text('GemPrint identification record', margin + 330, 616, { width: 165, align: 'right' })
      document
        .fillColor('#777777')
        .fontSize(7)
        .text(
          'This document records the gemstone details and observations supplied by the issuing laboratory. It is not a substitute for independent professional assessment.',
          margin,
          680,
          { width: contentWidth, align: 'center' },
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
