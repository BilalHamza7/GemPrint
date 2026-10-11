import { useState } from 'react'
import { updateReport } from '../api/reportsApi'
import type { CreateReportInput, ReportDetail } from '../types/report'

type ReportEditorProps = {
  report: ReportDetail
  onSaved: () => void
  onCancel: () => void
}

/** Edits laboratory-supplied report and microscopic-capture data only. */
export function ReportEditor({ report, onSaved, onCancel }: ReportEditorProps) {
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function submit(form: HTMLFormElement) {
    const data = new FormData(form)
    const input: CreateReportInput = {
      issueDate: value(data, 'issueDate'),
      species: value(data, 'species'),
      variety: value(data, 'variety'),
      caratWeight: Number(data.get('caratWeight')),
      colour: value(data, 'colour'),
      cutShape: value(data, 'cutShape'),
      dimensions: value(data, 'dimensions'),
      comments: optional(data, 'comments'),
      microImageMagnification: optional(data, 'microImageMagnification'),
      microImageLighting: optional(data, 'microImageLighting'),
      microImageMicroscope: optional(data, 'microImageMicroscope'),
      microImageDevice: optional(data, 'microImageDevice'),
      microImageAreaNotes: optional(data, 'microImageAreaNotes'),
      microImageCapturedOn: optional(data, 'microImageCapturedOn'),
      microImageCaptureNotes: optional(data, 'microImageCaptureNotes'),
    }
    setError('')
    setIsSaving(true)
    try {
      await updateReport(report.id, input)
      onSaved()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The report could not be updated.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form
      className="mt-8 rounded-xl border border-amber-400/30 bg-stone-900/60 p-6"
      onSubmit={(event) => {
        event.preventDefault()
        void submit(event.currentTarget)
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold tracking-[0.16em] text-amber-400">EDIT REPORT</p>
          <p className="mt-1 text-sm text-stone-400">
            Update the laboratory record and microscopic-image capture context.
          </p>
        </div>
        <button type="button" onClick={onCancel} className="text-sm text-stone-400 hover:text-stone-200">
          Cancel
        </button>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Issue date" name="issueDate" type="date" defaultValue={report.issue_date} required />
        <Field label="Species" name="species" defaultValue={report.species} required />
        <Field label="Variety" name="variety" defaultValue={report.variety} required />
        <Field
          label="Carat weight"
          name="caratWeight"
          type="number"
          defaultValue={report.carat_weight}
          min="0.001"
          step="0.001"
          required
        />
        <Field label="Colour" name="colour" defaultValue={report.colour} required />
        <Field label="Cut / shape" name="cutShape" defaultValue={report.cut_shape} required />
        <Field label="Dimensions" name="dimensions" defaultValue={report.dimensions} required />
      </div>
      <label className="mt-4 block text-sm text-stone-300">
        Observations / comments
        <textarea name="comments" rows={3} defaultValue={report.comments ?? ''} className={textareaClassName} />
      </label>
      <fieldset className="mt-7 border-t border-stone-800 pt-6">
        <legend className="text-sm font-semibold tracking-[0.12em] text-amber-400">MICRO IMAGE CAPTURE CONTEXT</legend>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            label="Magnification"
            name="microImageMagnification"
            defaultValue={report.micro_image_magnification ?? ''}
          />
          <Field label="Lighting method" name="microImageLighting" defaultValue={report.micro_image_lighting ?? ''} />
          <Field label="Microscope" name="microImageMicroscope" defaultValue={report.micro_image_microscope ?? ''} />
          <Field label="Capture device" name="microImageDevice" defaultValue={report.micro_image_device ?? ''} />
          <Field
            label="Capture date"
            name="microImageCapturedOn"
            type="date"
            defaultValue={report.micro_image_captured_on ?? ''}
          />
          <Field
            label="Inclusion area / reference"
            name="microImageAreaNotes"
            defaultValue={report.micro_image_area_notes ?? ''}
          />
        </div>
        <label className="mt-4 block text-sm text-stone-300">
          Capture notes
          <textarea
            name="microImageCaptureNotes"
            rows={3}
            defaultValue={report.micro_image_capture_notes ?? ''}
            className={textareaClassName}
          />
        </label>
      </fieldset>
      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
      <button
        disabled={isSaving}
        className="mt-6 rounded-lg bg-amber-400 px-5 py-3 font-semibold text-stone-950 disabled:opacity-60"
      >
        {isSaving ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}

const inputClassName =
  'mt-1.5 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2.5 outline-none placeholder:text-stone-600 focus:border-amber-400'
const textareaClassName = `${inputClassName} mt-1.5`

function Field({ label, name, type = 'text', defaultValue, required, min, step }: Record<string, unknown>) {
  return (
    <label className="text-sm text-stone-300">
      {label as string}
      <input
        name={name as string}
        type={type as string}
        defaultValue={defaultValue as string | number}
        required={required as boolean | undefined}
        min={min as string | undefined}
        step={step as string | undefined}
        className={inputClassName}
      />
    </label>
  )
}

function value(data: FormData, key: string) {
  return String(data.get(key) ?? '').trim()
}

function optional(data: FormData, key: string) {
  return value(data, key) || undefined
}
