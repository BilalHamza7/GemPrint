import { useState } from 'react'
import { MicroscopicImageCropper, type MicroscopicImageFrame } from '../../../components/MicroscopicImageCropper'
import { createReport, uploadReportImage } from '../api/reportsApi'

export function RegisterReportView({
  onComplete,
  onCancel,
}: {
  onComplete: (reportId: string) => void
  onCancel: () => void
}) {
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [referenceImage, setReferenceImage] = useState<File | null>(null)
  const [referenceFrame, setReferenceFrame] = useState<MicroscopicImageFrame | null>(null)
  async function submit(form: HTMLFormElement) {
    const data = new FormData(form)
    setError('')
    setIsSubmitting(true)
    try {
      const report = await createReport({
        issueDate: String(data.get('issueDate') ?? ''),
        species: String(data.get('species') ?? '').trim(),
        variety: String(data.get('variety') ?? '').trim(),
        caratWeight: Number(data.get('caratWeight')),
        colour: String(data.get('colour') ?? '').trim(),
        cutShape: String(data.get('cutShape') ?? '').trim(),
        dimensions: String(data.get('dimensions') ?? '').trim(),
        comments: String(data.get('comments') ?? '').trim() || undefined,
        microImageMagnification: String(data.get('microImageMagnification') ?? '').trim() || undefined,
        microImageLighting: String(data.get('microImageLighting') ?? '').trim() || undefined,
        microImageMicroscope: String(data.get('microImageMicroscope') ?? '').trim() || undefined,
        microImageDevice: String(data.get('microImageDevice') ?? '').trim() || undefined,
        microImageAreaNotes: String(data.get('microImageAreaNotes') ?? '').trim() || undefined,
        microImageCapturedOn: String(data.get('microImageCapturedOn') ?? '') || undefined,
        microImageCaptureNotes: String(data.get('microImageCaptureNotes') ?? '').trim() || undefined,
      })
      const mainImage = data.get('mainImage')
      if (mainImage instanceof File && mainImage.size > 0) await uploadReportImage(report.id, 'macro', mainImage)
      if (!referenceImage) throw new Error('A microscopic fingerprint reference image is required for enrollment.')
      if (!referenceFrame) throw new Error('Position and confirm the standard microscopic fingerprint frame to enroll.')
      await uploadReportImage(report.id, 'inclusion', referenceImage, referenceFrame)
      onComplete(report.id)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The report could not be saved.')
    } finally {
      setIsSubmitting(false)
    }
  }
  const fields = [
    ['issueDate', 'Issue date', 'date'],
    ['species', 'Species', 'text'],
    ['variety', 'Variety', 'text'],
    ['caratWeight', 'Carat weight', 'number'],
    ['colour', 'Colour', 'text'],
    ['cutShape', 'Cut / shape', 'text'],
    ['dimensions', 'Dimensions', 'text'],
  ] as const
  return (
    <section className="mx-auto max-w-3xl px-6 py-12">
      <button className="text-sm text-stone-400 hover:text-stone-200" onClick={onCancel}>
        ← Back to registry
      </button>
      <p className="mt-8 text-sm font-semibold tracking-[0.2em] text-amber-400">REPORT REGISTRATION</p>
      <h1 className="mt-2 text-4xl font-semibold">New gemstone report</h1>
      <p className="mt-3 text-stone-400">
        Register the gemstone with a system-issued serial. A microscopic fingerprint reference is required; the
        commercial report image remains optional.
      </p>
      <form
        className="mt-8 rounded-xl border border-stone-800 bg-stone-900/30 p-6"
        onSubmit={(event) => {
          event.preventDefault()
          void submit(event.currentTarget)
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(([name, label, type]) => (
            <label className="text-sm text-stone-300" key={name}>
              {label}
              <input
                required
                min={name === 'caratWeight' ? '0.001' : undefined}
                step={name === 'caratWeight' ? '0.001' : undefined}
                name={name}
                type={type}
                className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2.5 outline-none focus:border-amber-400"
              />
            </label>
          ))}
        </div>
        <label className="mt-4 block text-sm text-stone-300">
          Observations / comments
          <textarea
            name="comments"
            rows={4}
            className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2.5 outline-none focus:border-amber-400"
          />
        </label>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-stone-300">
            Main report image
            <input
              name="mainImage"
              type="file"
              accept="image/jpeg,image/png"
              className="mt-1.5 block w-full text-sm text-stone-400 file:mr-3 file:rounded-md file:border-0 file:bg-stone-800 file:px-3 file:py-2 file:text-stone-200"
            />
          </label>
        </div>
        <MicroscopicImageCropper
          label="Microscopic fingerprint reference"
          helperText="Choose the original microscopic image, then position the distinctive inclusion inside the standard fingerprint frame."
          file={referenceImage}
          onFileChange={setReferenceImage}
          frame={referenceFrame}
          onFrameChange={setReferenceFrame}
        />
        <fieldset className="mt-7 border-t border-stone-800 pt-6">
          <legend className="text-sm font-semibold tracking-[0.12em] text-amber-400">
            MICRO IMAGE CAPTURE CONTEXT
          </legend>
          <p className="mt-2 text-sm leading-6 text-stone-400">
            Record the conditions used for the required fingerprint-reference image. These details help the laboratory
            reproduce a comparable microscopic view during verification.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input label="Magnification" name="microImageMagnification" placeholder="e.g. 40×" />
            <Input label="Lighting method" name="microImageLighting" placeholder="e.g. darkfield LED" />
            <Input label="Microscope" name="microImageMicroscope" placeholder="Model or type" />
            <Input label="Capture device" name="microImageDevice" placeholder="Camera or smartphone" />
            <Input label="Capture date" name="microImageCapturedOn" type="date" />
            <Input label="Inclusion area / reference" name="microImageAreaNotes" placeholder="e.g. crown, 10 o'clock" />
          </div>
          <label className="mt-4 block text-sm text-stone-300">
            Capture notes
            <textarea
              name="microImageCaptureNotes"
              rows={3}
              className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2.5 outline-none focus:border-amber-400"
              placeholder="Focus, orientation, inclusion description, or repeat-capture guidance"
            />
          </label>
        </fieldset>
        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-red-900/70 bg-red-950/30 p-3 text-sm text-red-300">
            {error}
          </p>
        )}
        <div className="mt-6 flex gap-3">
          <button
            disabled={isSubmitting}
            className="rounded-lg bg-amber-400 px-5 py-3 font-semibold text-stone-950 disabled:opacity-60"
          >
            {isSubmitting ? 'Saving…' : 'Save report'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-stone-700 px-5 py-3 text-stone-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  )
}

function Input({
  label,
  name,
  placeholder,
  type = 'text',
}: {
  label: string
  name: string
  placeholder?: string
  type?: string
}) {
  return (
    <label className="text-sm text-stone-300">
      {label}
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2.5 outline-none placeholder:text-stone-600 focus:border-amber-400"
      />
    </label>
  )
}
