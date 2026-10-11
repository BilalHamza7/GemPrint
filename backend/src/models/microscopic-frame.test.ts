import { describe, expect, it } from 'vitest'
import { parseMicroscopicImageFrame } from './microscopic-frame.js'

describe('parseMicroscopicImageFrame', () => {
  it('uses the complete 4:3 viewport when legacy uploads have no frame', () => {
    expect(parseMicroscopicImageFrame(undefined)).toEqual({ zoom: 1, offsetX: 0, offsetY: 0 })
  })

  it('accepts a confirmed pan within the zoom-specific limit', () => {
    expect(parseMicroscopicImageFrame(JSON.stringify({ zoom: 2, offsetX: 0.2, offsetY: -0.2 }))).toEqual({
      zoom: 2,
      offsetX: 0.2,
      offsetY: -0.2,
    })
  })

  it('rejects a pan which would expose empty frame space', () => {
    expect(() => parseMicroscopicImageFrame(JSON.stringify({ zoom: 1, offsetX: 0.1, offsetY: 0 }))).toThrow(
      'outside the permitted view',
    )
  })
})
