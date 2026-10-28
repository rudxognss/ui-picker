// Cell-art backend for terminals without image support: the scene renders at 2W x 2H sub-pixels, each cell packs its 4 quadrants into a block glyph with 2 colors.
import type { Canvas, Keyframe, Scene } from './canvas'
import { dimColor, VIEW_H, VIEW_W } from './canvas'
import { GLYPH_H, textWidth } from './font5x7'
import { PixelCanvas } from './pixel'

/** Glyph by quadrant mask: tl = 8, tr = 4, bl = 2, br = 1. */
export const QUADRANTS = [' ', '▗', '▖', '▄', '▝', '▐', '▞', '▟', '▘', '▚', '▌', '▙', '▀', '▜', '▛', '█'] as const
/** Labels overlay as glyph cells only from this width; narrower boxes keep the pure cell art. */
const LABEL_MIN_W = 20
const BYTES_PER_CELL = 12
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/** `under`: the pixels beneath the label when it was drawn; a later change there means something covered it. */
type Label = { x: number; y: number; s: string; c: number; scale: number; under: number[] }

const dist2 = (a: number, b: number): number => {
  const dr = ((a >> 16) & 255) - ((b >> 16) & 255)
  const dg = ((a >> 8) & 255) - ((b >> 8) & 255)
  const db = (a & 255) - (b & 255)
  return dr * dr + dg * dg + db * db
}

const le = (b: Uint8Array, o: number, v: number): void => {
  b[o] = v & 255
  b[o + 1] = (v >>> 8) & 255
  b[o + 2] = (v >>> 16) & 255
  b[o + 3] = (v >>> 24) & 255
}

/** Standard padded base64; a cell buffer's length is a multiple of 3, so no padding appears. */
export function base64(bytes: Uint8Array): string {
  const out: string[] = []
  for (let i = 0; i < bytes.length; i += 3) {
    const v = ((bytes[i] ?? 0) << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0)
    out.push(B64[(v >> 18) & 63]!, B64[(v >> 12) & 63]!, i + 1 < bytes.length ? B64[(v >> 6) & 63]! : '=', i + 2 < bytes.length ? B64[v & 63]! : '=')
  }
  return out.join('')
}

export class CellCanvas implements Canvas {
  readonly W: number
  readonly H: number
  private readonly px: PixelCanvas
  private labels: Label[] = []

  constructor(W: number, H: number) {
    this.W = W
    this.H = H
    this.px = new PixelCanvas(2 * W, 2 * H)
  }

  rect(x: number, y: number, w: number, h: number, c: number): void {
    this.px.rect(x, y, w, h, c)
  }

  rrect(x: number, y: number, w: number, h: number, r: number, fill: number, stroke?: number): void {
    this.px.rrect(x, y, w, h, r, fill, stroke)
  }

  hline(x: number, y: number, w: number, c: number, th?: number): void {
    this.px.hline(x, y, w, c, th)
  }

  vline(x: number, y: number, h: number, c: number, th?: number): void {
    this.px.vline(x, y, h, c, th)
  }

  /** Recorded, not rasterised: a 5x7 glyph is noise at sub-pixel scale. `toCells` overlays it when the box is wide enough and nothing covered it since. */
  text(x: number, y: number, s: string, c: number, scale = 1): void {
    this.labels.push({ x, y, s, c, scale, under: this.px.colorsUnder(x, y, textWidth(s, scale), GLYPH_H * scale) })
  }

  dim(p: number): void {
    this.px.dim(p)
    this.labels = this.labels.map(l => ({ ...l, c: dimColor(l.c, p), under: l.under.map(u => dimColor(u, p)) }))
  }

  pointer(x: number, y: number, click?: boolean): void {
    this.px.pointer(x, y, click)
  }

  touch(x: number, y: number, tap?: boolean): void {
    this.px.touch(x, y, tap)
  }

  /** Drawn to pixels, label included: a cap is about one cell, too small for a glyph overlay. */
  keycap(x: number, y: number, label: string): void {
    this.px.keycap(x, y, label)
  }

  run(scene: Scene, k: Keyframe): this {
    scene(this, k)
    return this
  }

  /** RasterProps.cells: base64 of W*H little-endian u32 triplets [codePoint, fg, bg]. */
  toCells(): string {
    const { W, H } = this
    const sub = this.px.idx
    const pal = this.px.palette
    const code = new Uint32Array(W * H)
    const fg = new Uint32Array(W * H)
    const bg = new Uint32Array(W * H)
    const quad = [0, 0, 0, 0]
    for (let cy = 0; cy < H; cy++)
      for (let cx = 0; cx < W; cx++) {
        const o = 2 * cy * 2 * W + 2 * cx
        quad[0] = pal[sub[o]!]!
        quad[1] = pal[sub[o + 1]!]!
        quad[2] = pal[sub[o + 2 * W]!]!
        quad[3] = pal[sub[o + 2 * W + 1]!]!
        // fg: most frequent of the 4 (first wins ties); bg: the one farthest from fg.
        let f = quad[0]!, best = 0
        for (let i = 0; i < 4; i++) {
          let n = 0
          for (let j = 0; j < 4; j++) if (quad[j] === quad[i]) n++
          if (n > best) {
            best = n
            f = quad[i]!
          }
        }
        let b = f, far = -1
        for (let i = 0; i < 4; i++) {
          const d = dist2(quad[i]!, f)
          if (d > far) {
            far = d
            b = quad[i]!
          }
        }
        let mask = 0
        for (let i = 0; i < 4; i++) if (dist2(quad[i]!, f) <= dist2(quad[i]!, b)) mask |= 8 >> i
        const cell = cy * W + cx
        code[cell] = QUADRANTS[mask]!.codePointAt(0)!
        fg[cell] = f
        bg[cell] = b
      }
    if (W >= LABEL_MIN_W) this.overlay(code, fg, bg)
    const bytes = new Uint8Array(W * H * BYTES_PER_CELL)
    for (let i = 0; i < W * H; i++) {
      le(bytes, i * BYTES_PER_CELL, code[i]!)
      le(bytes, i * BYTES_PER_CELL + 4, fg[i]!)
      le(bytes, i * BYTES_PER_CELL + 8, bg[i]!)
    }
    return base64(bytes)
  }

  private covered(l: Label): boolean {
    const now = this.px.colorsUnder(l.x, l.y, textWidth(l.s, l.scale), GLYPH_H * l.scale)
    return now.some((c, i) => c !== l.under[i])
  }

  /** Each visible label whose cells fit inside the box becomes ASCII glyph cells: fg = label color, bg = the art's dominant color there. */
  private overlay(code: Uint32Array, fg: Uint32Array, bg: Uint32Array): void {
    const cellW = VIEW_W / this.W
    const cellH = VIEW_H / this.H
    const dominant = Uint32Array.from(fg)
    for (const l of this.labels) {
      const cx = Math.round(l.x / cellW)
      const cy = Math.floor((l.y + (GLYPH_H * l.scale) / 2) / cellH)
      if (cx < 0 || cy < 0 || cy >= this.H || cx + l.s.length > this.W || this.covered(l)) continue
      for (let i = 0; i < l.s.length; i++) {
        const ch = l.s.charCodeAt(i)
        if (ch < 32 || ch > 126) continue
        const cell = cy * this.W + cx + i
        code[cell] = ch
        fg[cell] = l.c
        bg[cell] = dominant[cell]!
      }
    }
  }
}
