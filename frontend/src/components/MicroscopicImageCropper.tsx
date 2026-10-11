import { useEffect, useRef, useState, type PointerEvent } from 'react'

/**
 * The user's intentional framing of a microscopic image. The frame has a fixed
 * 4:3 aspect ratio because the CV service will later create a 1280 × 960 ROI.
 */
export type MicroscopicImageFrame = {
  zoom: number
  offsetX: number
  offsetY: number
}

type MicroscopicImageCropperProps = {
  file: File | null
  onFileChange: (file: File | null) => void
  frame: MicroscopicImageFrame | null
  onFrameChange: (frame: MicroscopicImageFrame | null) => void
  label: string
  helperText: string
}

const DEFAULT_FRAME: MicroscopicImageFrame = { zoom: 1, offsetX: 0, offsetY: 0 }

/**
 * This is a user-guided capture aid, not an image-processing stage. It leaves
 * the uploaded source file unchanged. The next CV integration step will use the
 * approved frame to create the standard ROI before grayscale and CLAHE begin.
 */
export function MicroscopicImageCropper({
  file,
  onFileChange,
  frame,
  onFrameChange,
  label,
  helperText,
}: MicroscopicImageCropperProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [draftFrame, setDraftFrame] = useState<MicroscopicImageFrame>(DEFAULT_FRAME)
  const [dragStart, setDragStart] = useState<{
    clientX: number
    clientY: number
    frame: MicroscopicImageFrame
  } | null>(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }

    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setDraftFrame(DEFAULT_FRAME)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function chooseFile(nextFile: File | null) {
    onFileChange(nextFile)
    onFrameChange(null)
  }

  function beginPan(event: PointerEvent<HTMLDivElement>) {
    if (!previewUrl) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragStart({ clientX: event.clientX, clientY: event.clientY, frame: draftFrame })
  }

  function panImage(event: PointerEvent<HTMLDivElement>) {
    if (!dragStart || !viewportRef.current) return

    const bounds = viewportRef.current.getBoundingClientRect()
    const panLimit = (dragStart.frame.zoom - 1) / (2 * dragStart.frame.zoom)

    // At 1× the source exactly fills the viewport, so it cannot be panned into
    // empty space. Extra zoom creates the safe panning area.
    setDraftFrame({
      ...dragStart.frame,
      // Store a proportional offset so the approved frame can be recreated later.
      offsetX: clamp(dragStart.frame.offsetX + (event.clientX - dragStart.clientX) / bounds.width, -panLimit, panLimit),
      offsetY: clamp(
        dragStart.frame.offsetY + (event.clientY - dragStart.clientY) / bounds.height,
        -panLimit,
        panLimit,
      ),
    })
    onFrameChange(null)
  }

  function finishPan() {
    setDragStart(null)
  }

  return (
    <section className="mt-5 rounded-xl border border-stone-700 bg-stone-950/60 p-4">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-baseline">
        <div>
          <h2 className="text-sm font-semibold text-stone-100">{label}</h2>
          <p className="mt-1 text-sm leading-6 text-stone-400">{helperText}</p>
        </div>
        {frame && <span className="text-xs font-medium text-emerald-300">Frame confirmed</span>}
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
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="text-stone-300">Drag the image to place the selected inclusion inside the fixed frame.</p>
            <span className="rounded bg-stone-800 px-2 py-1 text-xs font-medium text-stone-300">1280 × 960 · 4:3</span>
          </div>

          <div
            ref={viewportRef}
            role="application"
            aria-label="Fixed microscopic feature framing viewport"
            onPointerDown={beginPan}
            onPointerMove={panImage}
            onPointerUp={finishPan}
            onPointerCancel={finishPan}
            className="relative mt-3 aspect-[4/3] touch-none cursor-grab overflow-hidden rounded-lg border-2 border-amber-400 bg-black active:cursor-grabbing"
          >
            <img
              src={previewUrl}
              alt="Microscopic image being positioned inside the fixed fingerprint frame"
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover transition-transform duration-75"
              style={{
                transform: `translate(${draftFrame.offsetX * 100}%, ${draftFrame.offsetY * 100}%) scale(${draftFrame.zoom})`,
              }}
            />
            <div className="pointer-events-none absolute inset-0 border-[3px] border-amber-300/90 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.5)]">
              <div className="absolute left-2 top-2 rounded bg-amber-400 px-2 py-1 text-xs font-semibold text-stone-950">
                Standard fingerprint frame
              </div>
            </div>
          </div>

          <label className="mt-4 block text-sm text-stone-300">
            Zoom
            <div className="mt-2 flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={draftFrame.zoom}
                onChange={(event) => {
                  const zoom = Number(event.target.value)
                  const panLimit = (zoom - 1) / (2 * zoom)
                  setDraftFrame((current) => ({
                    zoom,
                    offsetX: clamp(current.offsetX, -panLimit, panLimit),
                    offsetY: clamp(current.offsetY, -panLimit, panLimit),
                  }))
                  onFrameChange(null)
                }}
                className="w-full accent-amber-400"
              />
              <span className="w-12 text-right text-xs text-stone-400">{draftFrame.zoom.toFixed(2)}×</span>
            </div>
          </label>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="max-w-xl leading-6 text-stone-500">
              The original image is retained unchanged as laboratory evidence. Only the approved standard frame will
              later be used as the CV input.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setDraftFrame(DEFAULT_FRAME)
                  onFrameChange(null)
                }}
                className="rounded-md border border-stone-600 px-3 py-2 text-stone-300 hover:border-stone-400"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => onFrameChange(draftFrame)}
                className="rounded-md bg-amber-400 px-3 py-2 font-semibold text-stone-950 hover:bg-amber-300"
              >
                Confirm frame
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum)
}
