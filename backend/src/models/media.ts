export const MEDIA_KINDS = ['macro', 'inclusion'] as const
export type MediaKind = typeof MEDIA_KINDS[number]

export function isMediaKind(value: string): value is MediaKind {
  return MEDIA_KINDS.includes(value as MediaKind)
}
