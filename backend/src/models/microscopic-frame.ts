/**
 * A browser-confirmed fixed 4:3 source region. These values describe input
 * framing only; the CV pipeline still starts at grayscale/CLAHE.
 */
export type MicroscopicImageFrame = {
  x: number
  y: number
  width: number
  height: number
}

// Compatibility fallback for older profile-image uploads that have no confirmed window.
const DEFAULT_FRAME: MicroscopicImageFrame = { x: 0.125, y: 0.21875, width: 0.75, height: 0.5625 }
const TARGET_ASPECT_RATIO = 4 / 3

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
  const x = candidate.x
  const y = candidate.y
  const width = candidate.width
  const height = candidate.height
  if (
    typeof x !== 'number' ||
    typeof y !== 'number' ||
    typeof width !== 'number' ||
    typeof height !== 'number' ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    x < 0 ||
    y < 0 ||
    width <= 0 ||
    height <= 0 ||
    x + width > 1.001 ||
    y + height > 1.001
  ) {
    throw new Error('The microscopic image frame is invalid.')
  }

  if (Math.abs(width / height - TARGET_ASPECT_RATIO) > 0.02)
    throw new Error('The microscopic image frame must use the standard 4:3 view.')

  return { x, y, width, height }
}
