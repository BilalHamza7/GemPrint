import { useEffect, useRef, useState, type PointerEvent } from 'react'

/** A normalised fixed 4:3 source region that FastAPI resizes to 1280 × 960. */
export type MicroscopicImageFrame = {
  x: number
  y: number
  width: number
  height: number
}

type MicroscopicImageCropperProps = {
  file: File | null
  onFileChange: (file: File | null) => void
  frame: MicroscopicImageFrame | null
  onFrameChange: (frame: MicroscopicImageFrame | null) => void
  onPreviewChange?: (preview: string | null) => void
  label: string
  helperText: string
}

const FRAME_ASPECT_RATIO = 4 / 3

/**
 * A capture-alignment aid, not a preprocessing operation. The original upload
 * remains unchanged. The selected fixed window is recreated server-side before
 * grayscale, CLAHE, SIFT, FLANN and RANSAC processing take place.
 */
export function MicroscopicImageCropper({
  file,
  onFileChange,
  frame,
  onFrameChange,
  onPreviewChange,
  label,
  helperText,
}: MicroscopicImageCropperProps) {
  const imageRef = useRef<HTMLImageElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [draftFrame, setDraftFrame] = useState<MicroscopicImageFrame | null>(null)
  const [dragStart, setDragStart] = useState<{ x: number; y: number; frame: MicroscopicImageFrame } | null>(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      setDraftFrame(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setDraftFrame(null)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function chooseFile(nextFile: File | null) {
    onFileChange(nextFile)
    onFrameChange(null)
    onPreviewChange?.(null)
  }

  function initialiseFrame() {
    const image = imageRef.current
    if (!image?.naturalWidth || !image.naturalHeight) return
    setDraftFrame(defaultFrame(image.naturalWidth / image.naturalHeight))
  }

  function beginMove(event: PointerEvent<HTMLDivElement>) {
    if (!draftFrame) return
    const bounds = event.currentTarget.getBoundingClientRect()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragStart({
      x: (event.clientX - bounds.left) / bounds.width,
      y: (event.clientY - bounds.top) / bounds.height,
      frame: draftFrame,
    })
  }

  function moveFrame(event: PointerEvent<HTMLDivElement>) {
    if (!dragStart || !draftFrame) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - bounds.left) / bounds.width
    const y = (event.clientY - bounds.top) / bounds.height
    const next = {
      ...dragStart.frame,
      x: clamp(dragStart.frame.x + x - dragStart.x, 0, 1 - dragStart.frame.width),
      y: clamp(dragStart.frame.y + y - dragStart.y, 0, 1 - dragStart.frame.height),
    }
    setDraftFrame(next)
    onFrameChange(null)
    onPreviewChange?.(null)
  }

  return (
    <section className="mt-5 rounded-xl border border-stone-700 bg-stone-950/60 p-4">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-baseline">
        <div>
          <h2 className="text-sm font-semibold text-stone-100">{label}</h2>
          <p className="mt-1 text-sm leading-6 text-stone-400">{helperText}</p>
        </div>
        {frame && <span className="text-xs font-medium text-emerald-300">Window confirmed</span>}
      </div>

      <label className="mt-4 block text-sm text-stone-300">
        Choose image
        <input
          type="file"
          accept="image/jpeg,image/png"
          onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
          className="mt-1.5 block w-full text-sm text-stone-400 file:mr-3 file:rounded-md file:border-0 file:bg-stone-800 file:px-3 file:py-2 file:text-stone-200"
        />
      </label>

      {previewUrl && (
        <>
          <p className="mt-4 text-sm text-stone-300">
            Move the fixed 1280 × 960 fingerprint window over the distinctive inclusion. The image itself is never
            resized, zoomed, or changed in the browser.
          </p>
          <div className="mt-3 overflow-hidden rounded-lg border border-stone-700 bg-black p-1">
            <div
              role="application"
              aria-label="Movable fixed microscopic fingerprint window"
              onPointerMove={moveFrame}
              onPointerUp={() => setDragStart(null)}
              onPointerCancel={() => setDragStart(null)}
              className="relative mx-auto w-full touch-none"
            >
              <img
                ref={imageRef}
                src={previewUrl}
                alt="Microscopic image with a movable standard fingerprint window"
                draggable={false}
                onLoad={initialiseFrame}
                className="block w-full select-none"
              />
              {draftFrame && (
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Move standard fingerprint window"
                  onPointerDown={beginMove}
                  className="absolute cursor-grab border-2 border-amber-300 bg-amber-300/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] active:cursor-grabbing"
                  style={{
                    left: `${draftFrame.x * 100}%`,
                    top: `${draftFrame.y * 100}%`,
                    width: `${draftFrame.width * 100}%`,
                    height: `${draftFrame.height * 100}%`,
                  }}
                >
                  <span className="absolute -top-7 left-0 whitespace-nowrap rounded bg-amber-400 px-2 py-1 text-xs font-semibold text-stone-950">
                    1280 × 960 standard window
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="max-w-xl leading-6 text-stone-500">
              Keep the same physical inclusion within this window for enrollment and verification.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  initialiseFrame()
                  onFrameChange(null)
                  onPreviewChange?.(null)
                }}
                className="rounded-md border border-stone-600 px-3 py-2 text-stone-300 hover:border-stone-400"
              >
                Centre window
              </button>
              <button
                type="button"
                disabled={!draftFrame}
                onClick={() => {
                  if (!draftFrame) return
                  onFrameChange(draftFrame)
                  onPreviewChange?.(createRoiPreview(imageRef.current, draftFrame))
                }}
                className="rounded-md bg-amber-400 px-3 py-2 font-semibold text-stone-950 hover:bg-amber-300 disabled:opacity-60"
              >
                Confirm window
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

function defaultFrame(sourceAspectRatio: number): MicroscopicImageFrame {
  const preferredWidth = 0.55
  const preferredHeight = (preferredWidth * sourceAspectRatio) / FRAME_ASPECT_RATIO
  const height = Math.min(preferredHeight, 0.72)
  const width = height === preferredHeight ? preferredWidth : (height * FRAME_ASPECT_RATIO) / sourceAspectRatio
  return { x: (1 - width) / 2, y: (1 - height) / 2, width, height }
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum)
}

/** Browser-only visual confirmation; FastAPI independently creates the stored ROI. */
function createRoiPreview(image: HTMLImageElement | null, frame: MicroscopicImageFrame) {
  if (!image?.naturalWidth || !image.naturalHeight) return null
  const canvas = document.createElement('canvas')
  canvas.width = 1280
  canvas.height = 960
  const context = canvas.getContext('2d')
  if (!context) return null
  context.drawImage(
    image,
    Math.round(frame.x * image.naturalWidth),
    Math.round(frame.y * image.naturalHeight),
    Math.round(frame.width * image.naturalWidth),
    Math.round(frame.height * image.naturalHeight),
    0,
    0,
    canvas.width,
    canvas.height,
  )
  return canvas.toDataURL('image/png')
}
