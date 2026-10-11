import { describe, expect, it } from 'vitest'
import { parseMicroscopicImageFrame } from './microscopic-frame.js'

describe('parseMicroscopicImageFrame', () => {
  it('uses a centred standard window when legacy uploads have no frame', () => {
    expect(parseMicroscopicImageFrame(undefined)).toEqual({ x: 0.125, y: 0.21875, width: 0.75, height: 0.5625 })
  })

  it('accepts a standard 4:3 window inside the source image', () => {
    expect(parseMicroscopicImageFrame(JSON.stringify({ x: 0.2, y: 0.2, width: 0.6, height: 0.45 }))).toEqual({
      x: 0.2,
      y: 0.2,
      width: 0.6,
      height: 0.45,
    })
  })

  it('rejects a window with the wrong aspect ratio', () => {
    expect(() => parseMicroscopicImageFrame(JSON.stringify({ x: 0, y: 0, width: 0.5, height: 0.5 }))).toThrow(
      'standard 4:3 view',
    )
  })
})
