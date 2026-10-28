// Effect scenes (8 ids). Template: component.ts `drawer`. Motion is a pure function of k.p except where a storyboard in the
// spec (§8.3 scroll-reveal) spreads the scroll over the hold; pointer/touch only in idle, trigger, hold, rest and the first exit slot.
import type { Canvas, Keyframe, Rect, Scene } from '../canvas'
import { blend8, C, disc, PHASES, stage, VIEW_H, VIEW_W } from '../canvas'

const LABEL_SCALE = 2
/** Free-standing page titles; labels inside components stay at LABEL_SCALE so they fit their boxes. */
const TITLE_SCALE = 3
/** The second trigger slot shows the click or tap ring. */
const CLICK_SLOT = PHASES.trigger[0] + 1
const firstExit = (k: Keyframe): boolean => k.slot === PHASES.exit[0]
const atRest = (k: Keyframe): boolean => k.phase === 'idle' || k.phase === 'rest'
const clamp01 = (x: number): number => Math.min(1, Math.max(0, x))
const easeOut = (x: number): number => 1 - (1 - x) * (1 - x)
/** `color` faded toward the page background; `r` 0 = invisible, 1 = solid. */
const fade = (color: number, r: number): number => blend8(C.bg, color, r)

/** Placeholder card: image block and two text bars, every color faded by `r`. */
function card(c: Canvas, x: number, y: number, w: number, h: number, fill: number, r = 1): void {
  c.rrect(x, y, w, h, 4, fill)
  c.rect(x + 6, y + 6, w - 12, Math.round(h * 0.36), fade(C.line, r))
  c.rect(x + 6, y + Math.round(h * 0.36) + 12, w - 20, 3, fade(C.dot, r))
  c.rect(x + 6, y + Math.round(h * 0.36) + 20, w - 30, 3, fade(C.dot, r))
}

/** `rect` intersected with `clip`; nothing when they do not meet. */
function rectClip(c: Canvas, x: number, y: number, w: number, h: number, color: number, clip: Rect): void {
  const x0 = Math.max(x, clip.x), y0 = Math.max(y, clip.y)
  const x1 = Math.min(x + w, clip.x + clip.w), y1 = Math.min(y + h, clip.y + clip.h)
  if (x1 > x0 && y1 > y0) c.rect(x0, y0, x1 - x0, y1 - y0, color)
}

/** Filled disc clipped to `clip` (unit rows, like `disc`). */
function discClip(c: Canvas, cx: number, cy: number, r: number, color: number, clip: Rect): void {
  for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) {
    const d = Math.min(Math.abs(dy), Math.abs(dy + 1))
    if (d >= r) continue
    const hw = Math.sqrt(r * r - d * d)
    rectClip(c, cx - hw, cy + dy, 2 * hw, 1, color, clip)
  }
}

/** Upward arrow: shaft of `len` with a 5-wide head at the top. */
function arrowUp(c: Canvas, x: number, yTop: number, len: number, color: number): void {
  c.rect(x - 0.5, yTop, 1.5, len, color)
  for (let i = 0; i < 3; i++) c.rect(x - i - 0.5, yTop + i, 2 * i + 1.5, 1, color)
}

// --- hover-effect: the pointer moves onto the middle card; it lifts with a shadow and a lighter fill.

const HOVER_CARD = { w: 56, h: 60, y: 64, xs: [20, 92, 164] }
const HOVER_TARGET = 1
const HOVER_LIFT = 6
const HOVER_SHADOW = { dy: 5, pad: 2 }
const HOVER_LIGHTEN = 0.25
const HOVER_LABEL = { x: 16, y: 28, s: 'Hover' }
/** Pointer tips: resting, approaching below the card, on the card. */
const HOVER_POINTER = { rest: { x: 200, y: 140 }, near: { x: 120, y: 134 }, on: { x: 116, y: 96 } }

const hoverEffect: Scene = (c, k) => {
  stage.desktop(c, { rows: 0, cards: 0 })
  c.text(HOVER_LABEL.x, HOVER_LABEL.y, HOVER_LABEL.s, C.text, TITLE_SCALE)
  HOVER_CARD.xs.forEach((x, i) => {
    const lift = i === HOVER_TARGET ? k.p : 0
    if (lift > 0) c.rrect(x - HOVER_SHADOW.pad * lift, HOVER_CARD.y + HOVER_SHADOW.dy * lift, HOVER_CARD.w + 2 * HOVER_SHADOW.pad * lift, HOVER_CARD.h, 5, C.shadow)
    card(c, x, HOVER_CARD.y - HOVER_LIFT * lift, HOVER_CARD.w, HOVER_CARD.h, blend8(C.bar, C.white, HOVER_LIGHTEN * lift))
  })
  if (atRest(k)) c.pointer(HOVER_POINTER.rest.x, HOVER_POINTER.rest.y)
  else if (k.phase === 'trigger') c.pointer(k.slot === CLICK_SLOT ? HOVER_POINTER.on.x : HOVER_POINTER.near.x, k.slot === CLICK_SLOT ? HOVER_POINTER.on.y : HOVER_POINTER.near.y)
  else if (k.phase === 'hold') c.pointer(HOVER_POINTER.on.x, HOVER_POINTER.on.y - HOVER_LIFT)
  else if (firstExit(k)) c.pointer(HOVER_POINTER.near.x, HOVER_POINTER.near.y)
}

// --- scroll-reveal: the thumb scrolls three sections up past a dashed trigger line; each fades in and rises as its top crosses it.

const REVEAL = { x: 16, w: 200, h: 34, pitch: 50, startTop: 136, travel: 130, rise: 8, fadeDist: 18 }
const REVEAL_LINE = { y: 128, on: 6, off: 4 }
/** Slots over which the thumb travels (spec §8.3: s4-25); the hold then shows every section until the exit scrolls back. */
const REVEAL_SCROLL = { from: PHASES.enter[0], to: 25 }
const REVEAL_LABEL = { x: 16, y: 140, s: 'Reveal' }
const REVEAL_NAMES = ['A', 'B', 'C']
/** Page header already on screen in idle; it scrolls off with the sections. */
const REVEAL_HEADER = { x: 16, y: 14, rows: 2 }

/** Scroll position 0..1: slot-driven while scrolling down, p-driven on the way back. */
const revealScroll = (k: Keyframe): number =>
  k.phase === 'enter' || k.phase === 'hold' ? clamp01((k.slot - REVEAL_SCROLL.from + 1) / (REVEAL_SCROLL.to - REVEAL_SCROLL.from + 1)) : k.p

const scrollReveal: Scene = (c, k) => {
  const q = revealScroll(k)
  stage.textBars(c, REVEAL_HEADER.x, REVEAL_HEADER.y - REVEAL.travel * q, REVEAL_HEADER.rows)
  REVEAL_NAMES.forEach((name, i) => {
    const top = REVEAL.startTop + i * REVEAL.pitch - REVEAL.travel * q
    const r = clamp01((REVEAL_LINE.y - top) / REVEAL.fadeDist)
    if (r <= 0) return
    const y = top + REVEAL.rise * (1 - r)
    c.rrect(REVEAL.x, y, REVEAL.w, REVEAL.h, 4, fade(C.bar, r))
    c.text(REVEAL.x + 8, y + 10, name, fade(C.text, r), TITLE_SCALE)
    c.rect(REVEAL.x + 28, y + 10, 110, 4, fade(C.line, r))
    c.rect(REVEAL.x + 28, y + 20, 70, 4, fade(C.line, r))
  })
  for (let x = REVEAL.x; x < REVEAL.x + REVEAL.w; x += REVEAL_LINE.on + REVEAL_LINE.off) c.rect(x, REVEAL_LINE.y, REVEAL_LINE.on, 1, C.accent2)
  c.text(REVEAL_LABEL.x, REVEAL_LABEL.y, REVEAL_LABEL.s, C.text, TITLE_SCALE)
  stage.scrollbar(c, q)
}

// --- stagger: four cards enter one beat apart; numerals name the order, a timeline dot sweeps past four ticks.

const STAGGER_CARD = { w: 50, h: 70, y: 50, xs: [8, 66, 124, 182], rise: 16 }
const STAGGER_STEP = 0.18
const STAGGER_DUR = 0.46
const STAGGER_TIMELINE = { x: 20, y: 140, w: 200, h: 2, tick: 10, dotR: 3 }
const STAGGER_LABEL = { x: 16, y: 8, s: 'Stagger' }

const stagger: Scene = (c, k) => {
  c.text(STAGGER_LABEL.x, STAGGER_LABEL.y, STAGGER_LABEL.s, C.text, TITLE_SCALE)
  STAGGER_CARD.xs.forEach((x, i) => {
    const pi = clamp01((k.p - STAGGER_STEP * i) / STAGGER_DUR)
    c.text(x + STAGGER_CARD.w / 2 - 5, STAGGER_CARD.y - 18, String(i + 1), pi >= 1 ? C.text : C.dot, TITLE_SCALE)
    if (pi > 0) card(c, x, STAGGER_CARD.y + STAGGER_CARD.rise * (1 - pi), STAGGER_CARD.w, STAGGER_CARD.h, fade(C.bar, pi), pi)
  })
  const t = STAGGER_TIMELINE
  c.rect(t.x, t.y, t.w, t.h, C.bar)
  for (let i = 0; i < STAGGER_CARD.xs.length; i++) c.rect(t.x + t.w * STAGGER_STEP * i - 0.5, t.y - t.tick / 2 + 1, 1.5, t.tick, C.dot)
  disc(c, t.x + t.w * k.p, t.y + t.h / 2, t.dotR, C.accent2)
}

// --- smooth-transition: a click on segment B slides view A out to the left while view B eases in from the right; an easing curve tracks it.

const TRANS_LABEL = { x: 16, y: 24, s: 'Transition' }
/** Segmented control, two cells (A at x, B at x + w). */
const TRANS_SEG = { x: 168, y: 24, w: 28, h: 12 }
const TRANS_PANEL = { x: 16, y: 46, w: 200, h: 78, r: 6 }
const TRANS_SLIDE = 220
const TRANS_TILE = { w: 56, h: 28, cols: 3, rows: 2, gap: 8 }
const TRANS_CURVE = { x: 176, y: 130, w: 48, h: 26, pad: 4, samples: 24 }
const TRANS_POINTER = { rest: { x: 150, y: 140 }, dx: 14, dy: 6 }

function viewA(c: Canvas, x: number, r: number): void {
  const p = TRANS_PANEL
  c.rrect(x, p.y, p.w, p.h, p.r, fade(C.bar, r))
  c.rect(x + 8, p.y + 8, 80, p.h - 16, fade(C.line, r))
  const widths = [90, 70, 80]
  widths.forEach((w, i) => c.rect(x + 100, p.y + 12 + 16 * i, w, 4, fade(C.dot, r)))
}

function viewB(c: Canvas, x: number, r: number): void {
  const p = TRANS_PANEL, t = TRANS_TILE
  c.rrect(x, p.y, p.w, p.h, p.r, fade(C.bar, r))
  for (let i = 0; i < t.rows; i++)
    for (let j = 0; j < t.cols; j++) {
      const tx = x + 8 + j * (t.w + t.gap), ty = p.y + 8 + i * (t.h + t.gap)
      c.rrect(tx, ty, t.w, t.h, 3, fade(C.line, r))
      c.rect(tx + 4, ty + t.h - 8, t.w - 16, 3, fade(C.dot, r))
    }
}

function easingCurve(c: Canvas, p: number): void {
  const g = TRANS_CURVE
  const x0 = g.x + g.pad, y0 = g.y + g.h - g.pad, w = g.w - 2 * g.pad, h = g.h - 2 * g.pad
  c.rect(g.x, g.y, g.w, g.h, C.bar)
  c.rect(x0, y0, w, 1, C.line)
  c.rect(x0, y0 - h, 1, h, C.line)
  for (let i = 0; i <= g.samples; i++) c.rect(x0 + (w * i) / g.samples, y0 - h * easeOut(i / g.samples), 1, 1, C.dot)
  // p is already eased, so the dot's time axis is the inverse ease.
  disc(c, x0 + w * (1 - Math.sqrt(1 - p)), y0 - h * p, 2, C.accent2)
}

const smoothTransition: Scene = (c, k) => {
  stage.desktop(c, { rows: 0, cards: 0 })
  c.text(TRANS_LABEL.x, TRANS_LABEL.y, TRANS_LABEL.s, C.text, LABEL_SCALE)
  const active = k.p >= 0.5 ? 1 : 0
  const s = TRANS_SEG
  ;['A', 'B'].forEach((name, i) => {
    c.rrect(s.x + s.w * i, s.y, s.w, s.h, 3, active === i ? C.btn : C.bar)
    c.text(s.x + s.w * i + s.w / 2 - 2.5, s.y + 2.5, name, active === i ? C.white : C.text)
  })
  if (k.p < 1) viewA(c, TRANS_PANEL.x - TRANS_SLIDE * k.p, 1 - k.p)
  if (k.p > 0) viewB(c, TRANS_PANEL.x + TRANS_SLIDE * (1 - k.p), k.p)
  easingCurve(c, k.p)
  if (atRest(k)) c.pointer(TRANS_POINTER.rest.x, TRANS_POINTER.rest.y)
  else if (k.phase === 'trigger' || k.phase === 'hold') c.pointer(s.x + s.w + TRANS_POINTER.dx, s.y + TRANS_POINTER.dy, k.slot === CLICK_SLOT)
  else if (firstExit(k)) c.pointer(s.x + TRANS_POINTER.dx, s.y + TRANS_POINTER.dy, true)
}

// --- glassmorphism: a frosted panel with a light border slides up over three colorful blobs, which show through as pale tints.

const BLOBS = [
  { x: 56, y: 52, r: 34, color: 0xff375f, drift: 1 },
  { x: 150, y: 112, r: 42, color: 0x0a84ff, drift: -1 },
  { x: 192, y: 42, r: 26, color: 0xffd60a, drift: 1 },
]
const BLOB_DRIFT = 6
/** Soft edge: radius multipliers and strengths of the concentric discs, outside in. */
const BLOB_RINGS = [{ k: 1.4, a: 0.25 }, { k: 1.2, a: 0.5 }, { k: 1, a: 1 }]
/** Under the glass the same blobs are wider and paler (the blur). */
const FROST_RINGS = [{ k: 1.6, a: 0.125 }, { k: 1.3, a: 0.125 }, { k: 1, a: 0.25 }]
const GLASS = { x: 48, y: 36, w: 144, h: 88, r: 8, travel: 124, alpha: 0.75 }
const GLASS_LABEL = { dx: 12, dy: 10, s: 'Glass' }
const GLASS_BARS = { dx: 12, ys: [34, 44], ws: [90, 64] }
const GLASS_BUTTON = { dx: 12, dy: 58, w: 44, h: 14 }
const FROST = blend8(C.bg, C.white, GLASS.alpha)

const glassmorphism: Scene = (c, k) => {
  const blobAt = (b: (typeof BLOBS)[number]): { x: number; y: number } => ({ x: b.x + b.drift * BLOB_DRIFT * k.p, y: b.y - b.drift * BLOB_DRIFT * k.p })
  for (const b of BLOBS) for (const ring of BLOB_RINGS) disc(c, blobAt(b).x, blobAt(b).y, b.r * ring.k, fade(b.color, ring.a))
  if (k.p <= 0) return
  const y = GLASS.y + GLASS.travel * (1 - k.p)
  c.rrect(GLASS.x, y, GLASS.w, GLASS.h, GLASS.r, FROST, C.white)
  const inner: Rect = { x: GLASS.x + 1, y: y + 1, w: GLASS.w - 2, h: GLASS.h - 2 }
  for (const b of BLOBS) for (const ring of FROST_RINGS) discClip(c, blobAt(b).x, blobAt(b).y, b.r * ring.k, blend8(FROST, b.color, ring.a), inner)
  c.text(GLASS.x + GLASS_LABEL.dx, y + GLASS_LABEL.dy, GLASS_LABEL.s, C.ink, TITLE_SCALE)
  GLASS_BARS.ys.forEach((dy, i) => c.rect(GLASS.x + GLASS_BARS.dx, y + dy, GLASS_BARS.ws[i]!, 4, blend8(FROST, C.ink, 0.375)))
  c.rrect(GLASS.x + GLASS_BUTTON.dx, y + GLASS_BUTTON.dy, GLASS_BUTTON.w, GLASS_BUTTON.h, 4, C.btn)
}

// --- parallax: scrolling moves the front card 40 units and the hills behind it 12; a long and a short arrow spell out the difference.

const PARA_SHIFT = { hills: 12, card: 40 }
const PARA_HILLS = [{ x: 36, y: 152, r: 62 }, { x: 128, y: 164, r: 74 }, { x: 214, y: 156, r: 54 }]
const PARA_GROUND_Y = 150
const PARA_CARD = { x: 44, y: 76, w: 120, h: 60, r: 6 }
const PARA_LEGEND = { x: 182, cardTop: 58, hillsTop: 98 }
const PARA_LABEL = { x: 16, y: 8, s: 'Parallax' }

const parallax: Scene = (c, k) => {
  const dh = PARA_SHIFT.hills * k.p, dc = PARA_SHIFT.card * k.p
  for (const h of PARA_HILLS) disc(c, h.x, h.y - dh, h.r, C.hills)
  c.rect(0, PARA_GROUND_Y - dh, VIEW_W, VIEW_H - PARA_GROUND_Y + dh, C.hills)
  const p = PARA_CARD, y = p.y - dc
  c.rrect(p.x, y, p.w, p.h, p.r, C.panel)
  c.rect(p.x + 8, y + 8, 44, 44, C.panelLine)
  c.rect(p.x + 60, y + 14, 50, 4, C.handle)
  c.rect(p.x + 60, y + 26, 36, 4, C.panelLine)
  arrowUp(c, PARA_LEGEND.x, PARA_LEGEND.cardTop, PARA_SHIFT.card, C.accent2)
  arrowUp(c, PARA_LEGEND.x, PARA_LEGEND.hillsTop, PARA_SHIFT.hills, C.accent2)
  c.text(PARA_LABEL.x, PARA_LABEL.y, PARA_LABEL.s, C.text, TITLE_SCALE)
  stage.scrollbar(c, k.p)
}

// --- scroll-snap: a swipe drags full-screen sections on a phone; the scroll stops mid-way, then snaps to the next section.

const SNAP_STATUS_H = 14
const SNAP_FILLS = [C.bar, blend8(C.btn, C.bg, 0.5), blend8(C.accent2, C.bg, 0.5)]
/** Drag follows the finger until p 0.6, rests at 0.45 of a section until 0.8, then snaps to 1. */
const SNAP_STOP = { at: 0.45, from: 0.6, to: 0.8 }
const SNAP_DOTS = { dx: 7, r: 2, pitch: 8 }
const SNAP_ALIGN_TH = 1.5
const SNAP_TOUCH = { x: 120, down: 126, up: 98 }
const SNAP_LABEL = { x: 12, y: 72, s: 'Snap' }

function snapOffset(p: number): number {
  if (p <= SNAP_STOP.from) return SNAP_STOP.at * (p / SNAP_STOP.from)
  if (p <= SNAP_STOP.to) return SNAP_STOP.at
  return SNAP_STOP.at + ((1 - SNAP_STOP.at) * (p - SNAP_STOP.to)) / (1 - SNAP_STOP.to)
}

/** Repaints the bezel outside the screen's rounded bottom corners after square content covered them. */
function bezelCorners(c: Canvas, screen: Rect, r: number): void {
  for (let dy = 0; dy < r; dy++) {
    const d = r - dy - 0.5
    const inset = r - Math.sqrt(Math.max(0, r * r - d * d))
    const y = screen.y + screen.h - 1 - dy
    c.rect(screen.x, y, inset, 1, C.bezel)
    c.rect(screen.x + screen.w - inset, y, inset, 1, C.bezel)
  }
}

const scrollSnap: Scene = (c, k) => {
  const { screen } = stage.phone(c)
  const view: Rect = { x: screen.x, y: screen.y + SNAP_STATUS_H, w: screen.w, h: screen.h - SNAP_STATUS_H }
  const offset = snapOffset(k.p)
  SNAP_FILLS.forEach((fill, i) => {
    const top = view.y + (i - offset) * view.h
    rectClip(c, view.x, top, view.w, view.h, fill, view)
    rectClip(c, view.x + 10, top + 48, view.w - 28, 44, blend8(fill, C.white, 0.125), view)
    rectClip(c, view.x + 10, top + 100, 50, 4, blend8(fill, C.white, 0.375), view)
    rectClip(c, view.x + 10, top + 110, 34, 4, blend8(fill, C.white, 0.375), view)
    if (top + 20 >= view.y && top + 34 <= view.y + view.h) c.text(view.x + 10, top + 20, String(i + 1), C.white, TITLE_SCALE)
  })
  bezelCorners(c, screen, 6)
  const aligned = offset === 0 || offset === 1
  if (aligned) {
    c.rect(view.x, view.y, view.w, SNAP_ALIGN_TH, C.accent2)
    c.rect(view.x, view.y + view.h - SNAP_ALIGN_TH, view.w, SNAP_ALIGN_TH, C.accent2)
  }
  const page = offset >= 0.5 ? 1 : 0
  SNAP_FILLS.forEach((_, i) => disc(c, view.x + view.w - SNAP_DOTS.dx, view.y + view.h / 2 + (i - 1) * SNAP_DOTS.pitch, SNAP_DOTS.r, i === page ? C.white : C.dot))
  c.text(SNAP_LABEL.x, SNAP_LABEL.y, SNAP_LABEL.s, C.text, TITLE_SCALE)
  if (atRest(k)) c.touch(SNAP_TOUCH.x, SNAP_TOUCH.down)
  else if (k.phase === 'trigger') c.touch(SNAP_TOUCH.x, k.slot === CLICK_SLOT ? SNAP_TOUCH.up : SNAP_TOUCH.down, k.slot !== CLICK_SLOT)
  else if (firstExit(k)) c.touch(SNAP_TOUCH.x, SNAP_TOUCH.up, true)
}

// --- micro-interaction: a tap on a heart; it pops larger, fills with color, the count ticks 12 -> 13, then it settles.

const LIKE_CARD = { x: 78, y: 24, w: 84, h: 104, r: 6 }
const LIKE_IMAGE = { dx: 4, dy: 4, w: 76, h: 50 }
const LIKE_BARS = { dx: 4, ys: [60, 68], ws: [56, 40] }
const LIKE_HEART = { x: 92, y: 112, hw: 6, pop: 0.6 }
const LIKE_COLOR = 0xff375f
const LIKE_COUNT = { x: 104, y: 105, before: '12', after: '13' }
const LIKE_PARTICLES = { n: 6, r0: 9, r1: 20, size: 1.5 }
const LIKE_TOUCH_REST = { x: 130, y: 142 }
const LIKE_LABEL = { x: 182, y: 72, s: 'Tap' }

/** Heart of half-width `hw` centred at (cx, cy): two lobes and a tapering body. */
function heart(c: Canvas, cx: number, cy: number, hw: number, color: number): void {
  const lobeR = hw / 2, lobeY = cy - 0.35 * hw, tipY = cy + 0.9 * hw
  disc(c, cx - lobeR, lobeY, lobeR, color)
  disc(c, cx + lobeR, lobeY, lobeR, color)
  for (let y = lobeY; y < tipY; y += 1) {
    const w = (2 * hw * (tipY - y)) / (tipY - lobeY)
    c.rect(cx - w / 2, y, w, 1, color)
  }
}

const microInteraction: Scene = (c, k) => {
  stage.phone(c)
  const d = LIKE_CARD
  c.rrect(d.x, d.y, d.w, d.h, d.r, C.bar)
  c.rect(d.x + LIKE_IMAGE.dx, d.y + LIKE_IMAGE.dy, LIKE_IMAGE.w, LIKE_IMAGE.h, C.line)
  LIKE_BARS.ys.forEach((dy, i) => c.rect(d.x + LIKE_BARS.dx, d.y + dy, LIKE_BARS.ws[i]!, 3, C.dot))
  const pop = Math.sin(Math.PI * k.p)
  heart(c, LIKE_HEART.x, LIKE_HEART.y, LIKE_HEART.hw * (1 + LIKE_HEART.pop * pop), blend8(C.handle, LIKE_COLOR, k.p))
  if (k.p > 0 && k.p < 1)
    for (let i = 0; i < LIKE_PARTICLES.n; i++) {
      const a = (i / LIKE_PARTICLES.n) * 2 * Math.PI, r = LIKE_PARTICLES.r0 + (LIKE_PARTICLES.r1 - LIKE_PARTICLES.r0) * k.p
      c.rect(LIKE_HEART.x + r * Math.cos(a) - LIKE_PARTICLES.size / 2, LIKE_HEART.y + r * Math.sin(a) - LIKE_PARTICLES.size / 2, LIKE_PARTICLES.size, LIKE_PARTICLES.size, blend8(LIKE_COLOR, C.bar, k.p))
    }
  c.text(LIKE_COUNT.x, LIKE_COUNT.y, k.p >= 0.5 ? LIKE_COUNT.after : LIKE_COUNT.before, C.text, TITLE_SCALE)
  c.text(LIKE_LABEL.x, LIKE_LABEL.y, LIKE_LABEL.s, C.text, TITLE_SCALE)
  if (atRest(k) || k.phase === 'hold') c.touch(LIKE_TOUCH_REST.x, LIKE_TOUCH_REST.y)
  else if (k.phase === 'trigger' || firstExit(k)) c.touch(LIKE_HEART.x, LIKE_HEART.y, k.slot === CLICK_SLOT || firstExit(k))
}

export const EFFECT: Readonly<Record<string, Scene>> = {
  'hover-effect': hoverEffect,
  'scroll-reveal': scrollReveal,
  stagger,
  'smooth-transition': smoothTransition,
  glassmorphism,
  parallax,
  'scroll-snap': scrollSnap,
  'micro-interaction': microInteraction,
}
