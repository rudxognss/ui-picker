// Constants and helpers every scene file uses; scene-specific numbers stay in their own file.
import type { Keyframe } from '../canvas'
import { blend8, C, PHASES } from '../canvas'

export { easeOut, TEXT_BAR_H } from '../canvas'

/** Labels at 2 units per dot stay legible once a frame is downsampled into a card. */
export const LABEL_SCALE = 2
/** Free-standing page titles; labels inside components stay at LABEL_SCALE so they fit their boxes. */
export const TITLE_SCALE = 3
/** The second trigger slot shows the click or tap ring. */
export const CLICK_SLOT = PHASES.trigger[0] + 1
export const FIRST_EXIT = PHASES.exit[0]
/** Pointer tip relative to the bar button it presses. */
export const POINTER_ON_BUTTON = { dx: 12, dy: 5 }
export const atRest = (k: Keyframe): boolean => k.phase === 'idle' || k.phase === 'rest'
export const clamp01 = (x: number): number => Math.min(1, Math.max(0, x))
/** `color` mixed from the page background; r 0 = invisible, 1 = solid, adds no palette entry at either end. */
export const fade = (color: number, r: number): number => blend8(C.bg, color, r)
