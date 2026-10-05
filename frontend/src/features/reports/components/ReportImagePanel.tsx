import { useEffect, useState } from 'react'
import { getReportImageUrl, type MediaKind, uploadReportImage } from '../api/reportsApi'

export function ReportImagePanel({ reportId, kind, title, hasImage }: { reportId: string; kind: MediaKind; title: string; hasImage: boolean }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  useEffect(() => { if (hasImage) void getReportImageUrl(reportId, kind).then(({ signedUrl }) => setUrl(signedUrl)).catch((caught) => setError(caught instanceof Error ? caught.message : 'Could not load image.')) }, [hasImage, kind, reportId])
  async function upload(file: File) { setError(''); setIsUploading(true); try { await uploadReportImage(reportId, kind, file); const { signedUrl } = await getReportImageUrl(reportId, kind); setUrl(signedUrl) } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not upload image.') } finally { setIsUploading(false) } }
  return <article className="rounded-xl border border-stone-800 bg-stone-900/30 p-5"><p className="text-xs uppercase tracking-wider text-stone-500">{title}</p>{url ? <img className="mt-4 aspect-video w-full rounded-lg border border-stone-800 object-cover" src={url} alt={title} /> : <p className="mt-3 text-sm text-stone-400">No image uploaded.</p>}<label className="mt-4 block cursor-pointer rounded-lg border border-dashed border-stone-700 px-3 py-3 text-center text-sm text-stone-300 hover:border-amber-400">{isUploading ? 'Uploading…' : url ? 'Replace image' : 'Upload JPEG or PNG'}<input className="sr-only" disabled={isUploading} type="file" accept="image/jpeg,image/png" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file) }} /></label>{error && <p className="mt-3 text-sm text-red-300">{error}</p>}</article>
}
