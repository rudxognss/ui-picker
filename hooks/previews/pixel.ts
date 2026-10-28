// Palette-indexed pixel backend: the PNG generator renders scenes here at 480x320; CellCanvas renders at 2W x 2H sub-pixels.
import type { Canvas, Scene } from './canvas'
import { C, dimColor, drawKeycap, drawPointer, drawTouch, keyframe, SLOTS, VIEW_H, VIEW_W } from './canvas'
import { ADVANCE, GLYPH_H, GLYPH_W, glyphRow } from './font5x7'

const MAX_COLORS = 256
const FNV_OFFSET = 0x811c9dc5
const FNV_PRIME = 0x01000193

export class PixelCanvas implements Canvas {
  readonly W: number
  readonly H: number
  /** Row-major palette indices, W*H. */
  readonly idx: Uint8Array
  /** 0xRRGGBB per index; [0] is C.bg. */
  readonly palette: number[] = []
  private readonly index = new Map<number, number>()
  private readonly sx: number
  private readonly sy: number

  constructor(W: number, H: number) {
    this.W = W
    this.H = H
    this.sx = W / VIEW_W
    this.sy = H / VIEW_H
    this.idx = new Uint8Array(W * H).fill(this.color(C.bg))
  }

  /** Palette index of `c`, allocating one; throws past 256 colors (the PNG budget). */
  color(c: number): number {
    let i = this.index.get(c)
    if (i === undefined) {
      if (this.palette.length >= MAX_COLORS) throw new RangeError('PixelCanvas: more than ' + MAX_COLORS + ' colors')
      i = this.palette.length
      this.palette.push(c)
      this.index.set(c, i)
    }
    return i
  }

  /** Design-unit span -> device [a, b), rounded per edge, at least 1 px, clipped to [0, max]. */
  private span(v: number, len: number, scale: number, max: number): [number, number] {
    let a = Math.round(v * scale)
    let b = Math.round((v + len) * scale)
    if (b <= a) b = a + 1
    a = Math.max(0, a)
    b = Math.min(max, b)
    return [a, b]
  }

  private fillDevice(x0: number, x1: number, y0: number, y1: number, ci: number): void {
    for (let y = y0; y < y1; y++) this.idx.fill(ci, y * this.W + x0, y * this.W + x1)
  }

  /** Device-space rounded rect: rows inside the corner zones inset by an elliptical arc. */
  private fillRR(x0: number, y0: number, x1: number, y1: number, rx: number, ry: number, ci: number): void {
    if (x1 <= x0 || y1 <= y0) return
    rx = Math.min(rx, Math.floor((x1 - x0) / 2))
    ry = Math.min(ry, Math.floor((y1 - y0) / 2))
    if (rx <= 0 || ry <= 0) {
      this.fillDevice(x0, x1, y0, y1, ci)
      return
    }
    for (let y = y0; y < y1; y++) {
      const dTop = y0 + ry - (y + 0.5)
      const dBot = y + 0.5 - (y1 - ry)
      const d = Math.max(dTop, dBot) / ry
      const inset = d > 0 ? Math.round(rx - rx * Math.sqrt(Math.max(0, 1 - d * d))) : 0
      this.fillDevice(x0 + inset, x1 - inset, y, y + 1, ci)
    }
  }

  rect(x: number, y: number, w: number, h: number, c: number): void {
    if (w <= 0 || h <= 0) return
    const [x0, x1] = this.span(x, w, this.sx, this.W)
    const [y0, y1] = this.span(y, h, this.sy, this.H)
    if (x1 <= x0 || y1 <= y0) return
    this.fillDevice(x0, x1, y0, y1, this.color(c))
  }

  rrect(x: number, y: number, w: number, h: number, r: number, fill: number, stroke?: number): void {
    if (w <= 0 || h <= 0) return
    const [x0, x1] = this.span(x, w, this.sx, this.W)
    const [y0, y1] = this.span(y, h, this.sy, this.H)
    const rx = Math.round(r * this.sx)
    const ry = Math.round(r * this.sy)
    if (stroke === undefined) {
      this.fillRR(x0, y0, x1, y1, rx, ry, this.color(fill))
      return
    }
    this.fillRR(x0, y0, x1, y1, rx, ry, this.color(stroke))
    this.fillRR(x0 + 1, y0 + 1, x1 - 1, y1 - 1, rx - 1, ry - 1, this.color(fill))
  }

  /** Colors of the device pixels under a design-unit box, row-major; CellCanvas snapshots label footprints with it. */
  colorsUnder(x: number, y: number, w: number, h: number): number[] {
    const [x0, x1] = this.span(x, w, this.sx, this.W)
    const [y0, y1] = this.span(y, h, this.sy, this.H)
    const out: number[] = []
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) out.push(this.palette[this.idx[yy * this.W + xx]!]!)
    return out
  }

  hline(x: number, y: number, w: number, c: number, th = 1): void {
    this.rect(x, y, w, th, c)
  }

  vline(x: number, y: number, h: number, c: number, th = 1): void {
    this.rect(x, y, th, h, c)
  }

  text(x: number, y: number, s: string, c: number, scale = 1): void {
    for (let i = 0; i < s.length; i++) {
      const gx = x + i * ADVANCE * scale
      for (let row = 0; row < GLYPH_H; row++) {
        const bits = glyphRow(s.charCodeAt(i), row)
        if (bits === 0) continue
        // Merge consecutive dots of a row into one rect so fractional scales keep clean edges.
        let run = -1
        for (let col = 0; col <= GLYPH_W; col++) {
          const on = col < GLYPH_W && (bits & (1 << (GLYPH_W - 1 - col))) !== 0
          if (on && run < 0) run = col
          if (!on && run >= 0) {
            this.rect(gx + run * scale, y + row * scale, (col - run) * scale, scale, c)
            run = -1
          }
        }
      }
    }
  }

  dim(p: number): void {
    if (p <= 0) return
    const n = this.palette.length
    const remap = new Uint8Array(n)
    for (let i = 0; i < n; i++) remap[i] = this.color(dimColor(this.palette[i]!, p))
    for (let j = 0; j < this.idx.length; j++) this.idx[j] = remap[this.idx[j]!]!
  }

  pointer(x: number, y: number, click = false): void {
    drawPointer(this, x, y, click)
  }

  touch(x: number, y: number, tap = false): void {
    drawTouch(this, x, y, tap)
  }

  keycap(x: number, y: number, label: string): void {
    drawKeycap(this, x, y, label)
  }

  /** FNV-1a 32 over the pixels' RGB bytes (palette order does not matter); `seed` chains buffers. */
  hash(seed = FNV_OFFSET): number {
    let h = seed >>> 0
    const mix = (b: number): void => {
      h ^= b
      h = Math.imul(h, FNV_PRIME) >>> 0
    }
    for (let j = 0; j < this.idx.length; j++) {
      const c = this.palette[this.idx[j]!]!
      mix((c >> 16) & 255)
      mix((c >> 8) & 255)
      mix(c & 255)
    }
    return h >>> 0
  }
}

/** The scene drawn at `slot` on a fresh W x H PixelCanvas. */
export function renderSlot(scene: Scene, W: number, H: number, slot: number): PixelCanvas {
  const c = new PixelCanvas(W, H)
  scene(c, keyframe(slot))
  return c
}

/** 8 hex digits: FNV-1a 32 chained over all SLOTS frames of `scene` at W x H. The generator records it; tests detect drift. */
export function sceneHash(scene: Scene, W: number, H: number): string {
  let h = FNV_OFFSET
  for (let s = 0; s < SLOTS; s++) h = renderSlot(scene, W, H, s).hash(h)
  return h.toString(16).padStart(8, '0')
}
