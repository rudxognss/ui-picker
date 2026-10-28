import { slotOf } from './canvas'
import { PNG_H, PNG_INDEX, PNG_UNIQUE, PNG_W, SLOTS } from './png-frames'

export { PNG_H, PNG_INDEX, PNG_UNIQUE, PNG_W, SLOTS }

export function hasPng(id: string): boolean {
  return Object.hasOwn(PNG_INDEX, id)
}

/** The PNG frame (base64) for loop phase `t` (any real, wraps at 1). */
export function pngFrame(id: string, t: number): string {
  const slots = PNG_INDEX[id]
  if (!slots) throw new RangeError('unknown preview: ' + id)
  return PNG_UNIQUE[slots[slotOf(t)]!]!
}

/** Terminal cells are about twice as tall as wide, so a W-column box keeps the 3:2 picture at about W/3 rows. */
export function imageRows(W: number, minH: number, maxH: number): number {
  return Math.max(minH, Math.min(maxH, Math.round(W / 3)))
}
