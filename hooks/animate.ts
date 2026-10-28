import type { EngineInterface, Timer } from 'claude-code'
import { hasPng, pngFrame } from './previews/images'
import { frame, hasPreview, HOLD_T } from './previews/index'

/** `image`: a keyed Image swapped by PNG frame (kitty graphics terminals); `raster`: a keyed Raster repainted with cell art. */
export type Target = { key: string; preview: string; W: number; H: number; kind: 'raster' | 'image' }

export type AnimationHooks = {
  /** The terminal refused to draw an Image (it drew the alt): switch this session to Raster previews. */
  onImagesUnsupported?: (reason: string) => void | Promise<void>
}

export const CYCLE_MS = 4000
export const TICK_MS = 100
const MAX_MISSES = 15

let tick: Timer | undefined
let misses = 0

function drawable(x: Target): boolean {
  return x.kind === 'image' ? hasPng(x.preview) : hasPreview(x.preview)
}

/** Idempotent. The loop begins at the hold phase so the first blit continues the static frame (drawn at HOLD_T) instead of snapping to the closed state. */
export function startAnimation($: EngineInterface, requestId: string, targets: () => readonly Target[], hooks: AnimationHooks = {}): void {
  if (tick) return
  const start = Date.now() - HOLD_T * CYCLE_MS
  misses = 0
  tick = $.clock.every(TICK_MS, async () => {
    const t = ((Date.now() - start) % CYCLE_MS) / CYCLE_MS
    const live = targets().filter(drawable)
    if (live.length === 0) return
    let denied = 0
    for (const x of live) {
      const r =
        x.kind === 'image'
          ? await $.ui.blit({ requestId, key: x.key, source: { png: pngFrame(x.preview, t) } })
          : await $.ui.blit({ requestId, key: x.key, cells: frame(x.preview, x.W, x.H, t) })
      if (!r.deny) continue
      denied++
      if (x.kind === 'image' && /\balt\b/i.test(r.deny) && hooks.onImagesUnsupported) {
        await hooks.onImagesUnsupported(r.deny)
        return
      }
    }
    if (denied < live.length) misses = 0
    else if (++misses >= MAX_MISSES) stopAnimation()
  })
}

export function stopAnimation(): void {
  tick?.cancel()
  tick = undefined
  misses = 0
}
