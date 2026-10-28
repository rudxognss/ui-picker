// Scenes draw on a 240x160 design-unit canvas; backends (PixelCanvas, CellCanvas) scale per axis and clamp strokes to >= 1 device px.
import { textWidth } from './font5x7'

export type Phase = 'idle' | 'trigger' | 'enter' | 'hold' | 'exit' | 'rest'
/** `p`: 0 in idle/trigger, ease-out over enter, 1 in hold, ease-in over exit, 0 in rest. Enter and exit visit the same p values, so pointer-free frames dedupe. */
export type Keyframe = { slot: number; phase: Phase; p: number; t: number }
export type Scene = (c: Canvas, k: Keyframe) => void
export type Rect = { x: number; y: number; w: number; h: number }

export const VIEW_W = 240
export const VIEW_H = 160
export const SLOTS = 40
/** [first slot, one past the last slot) per phase; one slot is 100 ms. */
export const PHASES: Record<Phase, [number, number]> = {
  idle: [0, 2],
  trigger: [2, 4],
  enter: [4, 10],
  hold: [10, 30],
  exit: [30, 36],
  rest: [36, 40],
}
const PHASE_ORDER: readonly Phase[] = ['idle', 'trigger', 'enter', 'hold', 'exit', 'rest']

/** The slot loop phase `t` (any real, wraps at 1) falls into. */
export const slotOf = (t: number): number => Math.min(SLOTS - 1, Math.floor((((t % 1) + 1) % 1) * SLOTS))

export const easeOut = (x: number): number => 1 - (1 - x) * (1 - x)

function phaseOf(slot: number): Phase {
  return PHASE_ORDER.find(ph => slot >= PHASES[ph][0] && slot < PHASES[ph][1]) ?? 'rest'
}

export function keyframe(slot: number): Keyframe {
  const s = ((Math.floor(slot) % SLOTS) + SLOTS) % SLOTS
  const phase = phaseOf(s)
  const [a, b] = PHASES[phase]
  // Integer step so enter slot a+i and exit slot b-1-i compute the very same p.
  const step = phase === 'enter' ? s - a + 1 : phase === 'exit' ? b - s : 0
  const p = phase === 'hold' ? 1 : step === 0 ? 0 : easeOut(step / (b - a))
  return { slot: s, phase, p, t: s / SLOTS }
}

/** True when `k.slot` is within [a, b] inclusive. */
export const inSlots = (k: Keyframe, a: number, b: number): boolean => k.slot >= a && k.slot <= b

export interface Canvas {
  rect(x: number, y: number, w: number, h: number, c: number): void
  rrect(x: number, y: number, w: number, h: number, r: number, fill: number, stroke?: number): void
  hline(x: number, y: number, w: number, c: number, th?: number): void
  vline(x: number, y: number, h: number, c: number, th?: number): void
  /** 5x7 font, `scale` design units per dot. CellCanvas records labels and overlays them as glyph cells when they fit. */
  text(x: number, y: number, s: string, c: number, scale?: number): void
  /** Blends everything drawn so far toward C.shadow by 0.45*p, snapped to 1/8. */
  dim(p: number): void
  /** 7x10 arrow cursor with the tip at (x, y); `click` adds two ring arcs. */
  pointer(x: number, y: number, click?: boolean): void
  /** 9-unit finger disc centred on (x, y); `tap` adds a fading ring (phone scenes). */
  touch(x: number, y: number, tap?: boolean): void
  /** Keyboard cap, 9 tall, at least 16 wide, with an ink label. */
  keycap(x: number, y: number, label: string): void
}

// High-contrast dark palette: every surface sits two clear steps from its neighbour so a frame still reads when the terminal shrinks it into a cell box.
export const C = {
  bg: 0x1b1d2b,
  bar: 0x3b4160,
  dot: 0xa6adc8,
  btn: 0x3d8bff,
  line: 0x7f88ad,
  panel: 0xf6f7fb,
  panelLine: 0xc3c7d6,
  handle: 0x8e95b0,
  accent2: 0xffb020,
  shadow: 0x0e0f18,
  white: 0xffffff,
  ink: 0x1a1c28,
  text: 0xf4f5fb,
  bezel: 0x0a0b12,
  hills: 0x46507a,
} as const

const ch = (c: number, shift: number): number => (c >> shift) & 255
function blend(a: number, b: number, p: number): number {
  const q = Math.min(1, Math.max(0, p))
  const mix = (s: number): number => Math.round(ch(a, s) * (1 - q) + ch(b, s) * q)
  return (mix(16) << 16) | (mix(8) << 8) | mix(0)
}
/** `blend` with p snapped to eighths: bounded palettes, byte-identical frames. */
export const blend8 = (a: number, b: number, p: number): number => blend(a, b, Math.round(p * 8) / 8)

/** Darkening per unit of `dim(p)`. */
const DIM = 0.45
export const dimColor = (c: number, p: number): number => blend8(c, C.shadow, DIM * p)

// --- Pointer, touch, keycap: shared by every backend, drawn with the primitives above.

/** 7 wide x 10 tall; '1' ink outline, '2' white fill, tip at the top-left dot. */
const POINTER = ['1......', '11.....', '121....', '1221...', '12221..', '122221.', '1222221', '1221111', '121....', '11.....']
const RING_RADII = [5, 8]
/** Ring arcs skip the quadrant the arrow body covers (screen angles 0-90 deg, y down). */
const RING_ARC = { from: 100, to: 350, step: 10 }
const TOUCH_R = 4.5
const TOUCH_RING_R = 8
export const KEYCAP_H = 9
const KEYCAP_MIN_W = 16
const KEYCAP_PAD = 2

const dot = (c: Canvas, x: number, y: number, color: number): void => c.rect(x, y, 1, 1, color)

export function drawPointer(c: Canvas, x: number, y: number, click = false): void {
  POINTER.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const v = row[i]
      if (v === '1') dot(c, x + i, y + j, C.ink)
      else if (v === '2') dot(c, x + i, y + j, C.white)
    }
  })
  if (!click) return
  for (const r of RING_RADII)
    for (let a = RING_ARC.from; a <= RING_ARC.to; a += RING_ARC.step) {
      const rad = (a * Math.PI) / 180
      dot(c, x + r * Math.cos(rad), y + r * Math.sin(rad), C.accent2)
    }
}

/** Filled disc of radius `r` (design units), one rect per unit row. */
export function disc(c: Canvas, cx: number, cy: number, r: number, color: number): void {
  for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) {
    const y0 = dy, y1 = dy + 1
    const d = Math.min(Math.abs(y0), Math.abs(y1)) // nearest edge of this unit row to the centre
    if (d >= r) continue
    const hw = Math.sqrt(r * r - d * d)
    c.rect(cx - hw, cy + y0, 2 * hw, 1, color)
  }
}

/** Ring of outer radius `r` and thickness `th`. */
export function ring(c: Canvas, cx: number, cy: number, r: number, th: number, color: number): void {
  const ri = r - th
  for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) {
    const d = Math.min(Math.abs(dy), Math.abs(dy + 1))
    if (d >= r) continue
    const ho = Math.sqrt(r * r - d * d)
    const far = Math.max(Math.abs(dy), Math.abs(dy + 1))
    if (far >= ri) {
      c.rect(cx - ho, cy + dy, 2 * ho, 1, color)
      continue
    }
    const hi = Math.sqrt(ri * ri - far * far)
    c.rect(cx - ho, cy + dy, ho - hi, 1, color)
    c.rect(cx + hi, cy + dy, ho - hi, 1, color)
  }
}

export function drawTouch(c: Canvas, x: number, y: number, tap = false): void {
  disc(c, x, y, TOUCH_R, C.ink)
  disc(c, x, y, TOUCH_R - 1, C.white)
  if (tap) ring(c, x, y, TOUCH_RING_R, 1, C.accent2)
}

export const keycapWidth = (label: string): number => Math.max(KEYCAP_MIN_W, textWidth(label) + 2 * KEYCAP_PAD)

export function drawKeycap(c: Canvas, x: number, y: number, label: string): void {
  const w = keycapWidth(label)
  c.rrect(x, y, w, KEYCAP_H, 2, C.panel, C.handle)
  c.text(x + (w - textWidth(label)) / 2, y + 1, label, C.ink)
}

// --- Stage: the page chrome scenes start from.

export const BAR_H = 18
const BAR_DOTS_X = [8, 16, 24]
const BAR_BUTTON: Rect = { x: 200, y: 4, w: 32, h: 10 }
const BODY_X = 16
const BODY_Y = 30
const CARDS_Y = 90
const CARD: Rect = { x: 0, y: CARDS_Y, w: 60, h: 40 }
const CARDS_X = [16, 84]
export const TEXT_BAR_H = 4
const TEXT_BAR_PITCH = 12
const TEXT_BAR_WIDTHS = [160, 120, 140]
const PHONE: Rect = { x: 70, y: 0, w: 100, h: 160 }
const PHONE_R = 10
const PHONE_INSET = 4
const SCROLLBAR_X = 232
const SCROLLBAR_Y = 20
const SCROLLBAR_TRACK_H = 124
const SCROLLBAR_THUMB_H = 24
const SCROLLBAR_TRAVEL = 100

export type DesktopOpts = {
  /** Label of the accent button at the bar's right end. */
  button?: string
  /** The accent button drawn lighter (hovered). */
  hover?: boolean
  /** Body text bars below the bar (default 3). */
  rows?: number
  /** Placeholder cards under the text (default 2). */
  cards?: 0 | 2
}

export const stage = {
  /** Browser page: title bar with dots, URL pill and accent button; text bars; optional cards. Returns the button's rect for pointers. */
  desktop(c: Canvas, opts: DesktopOpts = {}): { button: Rect } {
    c.rect(0, 0, VIEW_W, BAR_H, C.bar)
    for (const x of BAR_DOTS_X) c.rrect(x - 2, BAR_H / 2 - 2, 4, 4, 2, C.dot)
    const b = BAR_BUTTON
    c.rrect(b.x, b.y, b.w, b.h, 3, opts.hover ? blend8(C.btn, C.white, 0.25) : C.btn)
    if (opts.button) c.text(b.x + (b.w - textWidth(opts.button)) / 2, b.y + 1, opts.button, C.white)
    stage.textBars(c, BODY_X, BODY_Y, opts.rows ?? 3)
    if ((opts.cards ?? 2) === 2)
      for (const x of CARDS_X) {
        c.rrect(x, CARD.y, CARD.w, CARD.h, 4, C.bar)
        c.rect(x + 6, CARD.y + 6, CARD.w - 12, 14, C.line)
        c.rect(x + 6, CARD.y + 24, 36, 3, C.dot)
        c.rect(x + 6, CARD.y + 31, 24, 3, C.dot)
      }
    return { button: { ...b } }
  },
  /** Phone: bezel with a 92x152 screen at (74, 4) and a status clock. Returns the screen's rect. */
  phone(c: Canvas): { screen: Rect } {
    c.rrect(PHONE.x, PHONE.y, PHONE.w, PHONE.h, PHONE_R, C.bezel)
    const screen = { x: PHONE.x + PHONE_INSET, y: PHONE.y + PHONE_INSET, w: PHONE.w - 2 * PHONE_INSET, h: PHONE.h - 2 * PHONE_INSET }
    c.rrect(screen.x, screen.y, screen.w, screen.h, PHONE_R - PHONE_INSET, C.bg)
    c.text(screen.x + 6, screen.y + 4, '9:41', C.dot)
    return { screen }
  },
  /** `rows` grey text bars from (x, y), widths cycling 160/120/140, 12 apart. */
  textBars(c: Canvas, x: number, y: number, rows: number): void {
    for (let i = 0; i < rows; i++) c.rect(x, y + i * TEXT_BAR_PITCH, TEXT_BAR_WIDTHS[i % TEXT_BAR_WIDTHS.length]!, TEXT_BAR_H, C.line)
  },
  /** Right-edge scrollbar; the thumb sits at `pos` in [0, 1] (y 20 -> 120). */
  scrollbar(c: Canvas, pos: number): void {
    c.rect(SCROLLBAR_X, SCROLLBAR_Y, 4, SCROLLBAR_TRACK_H, C.bar)
    c.rrect(SCROLLBAR_X, SCROLLBAR_Y + SCROLLBAR_TRAVEL * Math.min(1, Math.max(0, pos)), 4, SCROLLBAR_THUMB_H, 2, C.dot)
  },
}
