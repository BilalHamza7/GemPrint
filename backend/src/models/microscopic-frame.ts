/**
 * A browser-confirmed view of the fixed 4:3 fingerprint frame. These values
 * describe input framing only; the CV pipeline still starts at grayscale/CLAHE.
 */
export type MicroscopicImageFrame = {
  zoom: number
  offsetX: number
  offsetY: number
}

const DEFAULT_FRAME: MicroscopicImageFrame = { zoom: 1, offsetX: 0, offsetY: 0 }

export function parseMicroscopicImageFrame(value: unknown): MicroscopicImageFrame {
  if (value === undefined || value === null || value === '') return DEFAULT_FRAME
  if (typeof value !== 'string') throw new Error('The microscopic image frame is invalid.')

  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error('The microscopic image frame is invalid.')
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('The microscopic image frame is invalid.')

  const candidate = parsed as Record<string, unknown>
  const zoom = candidate.zoom
  const offsetX = candidate.offsetX
  const offsetY = candidate.offsetY
  if (
    typeof zoom !== 'number' ||
    typeof offsetX !== 'number' ||
    typeof offsetY !== 'number' ||
    !Number.isFinite(zoom) ||
    !Number.isFinite(offsetX) ||
    !Number.isFinite(offsetY) ||
    zoom < 1 ||
    zoom > 3
  ) {
    throw new Error('The microscopic image frame is invalid.')
  }

  const panLimit = (zoom - 1) / (2 * zoom)
  if (Math.abs(offsetX) > panLimit + 0.001 || Math.abs(offsetY) > panLimit + 0.001)
    throw new Error('The microscopic image frame is outside the permitted view.')

  return { zoom, offsetX, offsetY }
}
