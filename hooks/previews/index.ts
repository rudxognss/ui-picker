import { keyframe, SLOTS, slotOf } from './canvas'
import { CellCanvas } from './cells'
import { SCENES } from './scenes/index'

export { SLOTS }

/** The loop phase a Raster is drawn at statically (the hold: every id's open state), so a pane whose blit loop is not running still tells its options apart. */
export const HOLD_T = 0.5

/** Every term id with a scene; `window` (the bare stage) is excluded. */
export const PREVIEW_IDS: readonly string[] = Object.keys(SCENES).filter(id => id !== 'window')

export function hasPreview(id: string): boolean {
  return Object.hasOwn(SCENES, id)
}

/** RasterProps.cells of `id` at loop phase `t` in a W x H cell box. */
export function frame(id: string, W: number, H: number, t: number): string {
  const scene = hasPreview(id) ? SCENES[id] : undefined
  if (!scene) throw new RangeError('unknown preview: ' + id)
  return new CellCanvas(W, H).run(scene, keyframe(slotOf(t))).toCells()
}
