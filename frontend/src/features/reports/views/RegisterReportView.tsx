import { useState } from 'react'
import { createReport } from '../api/reportsApi'

export function RegisterReportView({ onComplete, onCancel }: { onComplete: () => void; onCancel: () => void }) {
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  async function submit(form: HTMLFormElement) {
    const data = new FormData(form)
    setError('')
    setIsSubmitting(true)
    try {
      await createReport({
        serialNumber: String(data.get('serialNumber') ?? '').trim(),
        issueDate: String(data.get('issueDate') ?? ''),
        species: String(data.get('species') ?? '').trim(),
        variety: String(data.get('variety') ?? '').trim(),
        caratWeight: Number(data.get('caratWeight')),
        colour: String(data.get('colour') ?? '').trim(),
        cutShape: String(data.get('cutShape') ?? '').trim(),
        dimensions: String(data.get('dimensions') ?? '').trim(),
        comments: String(data.get('comments') ?? '').trim() || undefined,
      })
      onComplete()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The report could not be saved.')
    } finally {
      setIsSubmitting(false)
    }
  }
  const fields = [
    ['serialNumber', 'Report serial', 'text'],
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
        This creates the stable laboratory record. Inclusion image upload and extraction follow after the report exists.
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
