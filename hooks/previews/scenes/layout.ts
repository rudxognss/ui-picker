// Layout scenes (7 ids). Template: component.ts `drawer`. Motion is a pure function of k.p; pointers appear only in idle, trigger,
// hold and the first exit slot. Load-driven scenes (hero, cards, bento, split) share one trigger: the pointer clicks the bar's `Go`.
import type { Canvas, Keyframe, Rect, Scene } from '../canvas'
import { BAR_H, blend8, C, disc, inSlots, stage, VIEW_H, VIEW_W } from '../canvas'
import { textWidth } from '../font5x7'
import { clamp01, CLICK_SLOT, fade, FIRST_EXIT, LABEL_SCALE, POINTER_ON_BUTTON, TITLE_SCALE } from './shared'

const hoverOf = (color: number): number => blend8(color, C.white, 0.25)

/** Idle/rest pointer at `rest`; trigger pointer on the bar button, clicking at CLICK_SLOT. True when one of those phases was drawn. */
function loadTrigger(c: Canvas, k: Keyframe, button: Rect, rest: { x: number; y: number }): boolean {
  if (k.phase === 'idle' || k.phase === 'rest') {
    c.pointer(rest.x, rest.y)
    return true
  }
  if (k.phase === 'trigger') {
    c.pointer(button.x + POINTER_ON_BUTTON.dx, button.y + POINTER_ON_BUTTON.dy, k.slot === CLICK_SLOT)
    return true
  }
  return false
}

// --- Shared placeholders.

const MEDIA_R = 4
const MEDIA_SUN = { fx: 0.74, fy: 0.26, fr: 0.1 }
/** Ridge: a triangle of 2-unit rows from the panel's centre down to `pad` above its bottom. */
const MEDIA_RIDGE = { fy: 0.46, rowH: 2, pad: 4, shade: 0.5 }

/** Image placeholder: hills panel, sun disc, dark ridge; `p` fades it from the background. */
function media(c: Canvas, x: number, y: number, w: number, h: number, p: number): void {
  c.rrect(x, y, w, h, MEDIA_R, fade(C.hills, p))
  disc(c, x + w * MEDIA_SUN.fx, y + h * MEDIA_SUN.fy, Math.min(w, h) * MEDIA_SUN.fr, fade(C.accent2, p))
  const ridge = fade(blend8(C.hills, C.shadow, MEDIA_RIDGE.shade), p)
  const apexY = y + h * MEDIA_RIDGE.fy
  const rows = Math.floor((y + h - MEDIA_RIDGE.pad - apexY) / MEDIA_RIDGE.rowH)
  const halfStep = (w / 2 - MEDIA_RIDGE.pad) / rows
  for (let i = 1; i < rows; i++) c.rect(x + w / 2 - i * halfStep, apexY + i * MEDIA_RIDGE.rowH, 2 * i * halfStep, MEDIA_RIDGE.rowH, ridge)
}

const CARD_R = 3
const CARD_PAD = 5
const CARD_IMG_H = 14
const CARD_TITLE = { dy: 24, w: 36, h: 3 }
const CARD_LINE = { dy: 31, w: 24, h: 3 }

/** Placeholder card: image block, title bar, one line. `p` fades it; `fill` overrides the body color. */
function card(c: Canvas, x: number, y: number, w: number, h: number, p = 1, fill: number = C.bar): void {
  c.rrect(x, y, w, h, CARD_R, fade(fill, p))
  c.rect(x + CARD_PAD, y + CARD_PAD, w - 2 * CARD_PAD, CARD_IMG_H, fade(C.line, p))
  c.rect(x + CARD_PAD, y + CARD_TITLE.dy, CARD_TITLE.w, CARD_TITLE.h, fade(C.dot, p))
  c.rect(x + CARD_PAD, y + CARD_LINE.dy, CARD_LINE.w, CARD_LINE.h, fade(C.dot, p))
}

// --- hero-section: headline, subline and one CTA fade in on the left; a full-height image slides in from the right.

const HERO_REST = { x: 150, y: 110 }
const HERO_X = 16
const HERO_TITLE = { y: 40, label: 'Hero' }
const HERO_TITLE_BAR = { y: 58, w: 88, h: 8 }
const HERO_SUB = { ys: [74, 82], ws: [96, 72], h: 3 }
const HERO_CTA: Rect = { x: 16, y: 98, w: 48, h: 14 }
const HERO_CTA_LABEL = 'Start'
const HERO_IMAGE: Rect = { x: 128, y: 30, w: 112, h: 130 }
/** Hold slots where the pointer rests on the CTA, which lightens. */
const HERO_HOVER = { from: 14, to: 24 }
const HERO_POINTER_ON_CTA = { dx: 40, dy: 8 }

const heroSection: Scene = (c, k) => {
  const { button } = stage.desktop(c, { button: 'Go', hover: k.phase === 'trigger', rows: 0, cards: 0 })
  if (loadTrigger(c, k, button, HERO_REST)) return
  const p = k.p
  const hover = k.phase === 'hold' && inSlots(k, HERO_HOVER.from, HERO_HOVER.to)
  c.text(HERO_X, HERO_TITLE.y, HERO_TITLE.label, fade(C.text, p), LABEL_SCALE)
  c.rect(HERO_X, HERO_TITLE_BAR.y, HERO_TITLE_BAR.w, HERO_TITLE_BAR.h, fade(C.text, p))
  HERO_SUB.ys.forEach((y, i) => c.rect(HERO_X, y, HERO_SUB.ws[i]!, HERO_SUB.h, fade(C.line, p)))
  c.rrect(HERO_CTA.x, HERO_CTA.y, HERO_CTA.w, HERO_CTA.h, 3, fade(hover ? hoverOf(C.btn) : C.btn, p))
  c.text(HERO_CTA.x + (HERO_CTA.w - textWidth(HERO_CTA_LABEL)) / 2, HERO_CTA.y + 4, HERO_CTA_LABEL, fade(C.white, p))
  media(c, HERO_IMAGE.x + (VIEW_W - HERO_IMAGE.x) * (1 - p), HERO_IMAGE.y, HERO_IMAGE.w, HERO_IMAGE.h, 1)
  if (hover) c.pointer(HERO_CTA.x + HERO_POINTER_ON_CTA.dx, HERO_CTA.y + HERO_POINTER_ON_CTA.dy)
}

// --- responsive-layout: the pointer drags a window's right edge from desktop to phone width; 6 cards reflow 3 -> 2 -> 1 columns.

const RWIN = { x: 12, y: 12, h: 124, wide: 216, narrow: 100, r: 4, barH: 12, pad: 8, gap: 6 }
const RWIN_DOTS = { dxs: [8, 15, 22], r: 2 }
const RCARD = { h: 26, pad: 4, imgH: 12, bar: { h: 3, frac: 0.6 } }
const RITEMS = 6
const RLABEL = { x: 12, y: 142, label: 'Responsive' }
/** Title-bar readout per column count, widest first. */
const RWIDTHS = ['1280px', '1024px', '375px']
const RWIDTH_MARGIN = 6
const R_REST = { x: 200, y: 146 }
/** Columns by how far the window has narrowed; thresholds sit late because p eases out: 3 for the first enter slot, 2 for the next two, then 1. */
const colsAt = (p: number): number => (p < 0.4 ? 3 : p < 0.8 ? 2 : 1)

const responsiveLayout: Scene = (c, k) => {
  const p = k.p
  const w = RWIN.wide - (RWIN.wide - RWIN.narrow) * p
  c.rect(0, 0, VIEW_W, VIEW_H, C.shadow)
  c.rrect(RWIN.x, RWIN.y, w, RWIN.h, RWIN.r, C.bg, C.dot)
  c.rrect(RWIN.x, RWIN.y, w, RWIN.barH, RWIN.r, C.bar)
  c.rect(RWIN.x, RWIN.y + RWIN.barH / 2, w, RWIN.barH / 2, C.bar)
  for (const dx of RWIN_DOTS.dxs) disc(c, RWIN.x + dx, RWIN.y + RWIN.barH / 2, RWIN_DOTS.r, C.dot)
  const n = colsAt(p)
  const readout = RWIDTHS[3 - n]!
  c.text(RWIN.x + w - textWidth(readout) - RWIDTH_MARGIN, RWIN.y + 3, readout, C.text)
  const cw = (w - 2 * RWIN.pad - (n - 1) * RWIN.gap) / n
  const bodyTop = RWIN.y + RWIN.barH + RWIN.pad
  const bodyBottom = RWIN.y + RWIN.h - RWIN.pad
  for (let i = 0; i < RITEMS; i++) {
    const x = RWIN.x + RWIN.pad + (i % n) * (cw + RWIN.gap)
    const y = bodyTop + Math.floor(i / n) * (RCARD.h + RWIN.gap)
    if (y + RCARD.h > bodyBottom) break
    c.rrect(x, y, cw, RCARD.h, 2, C.bar)
    c.rect(x + RCARD.pad, y + RCARD.pad, cw - 2 * RCARD.pad, RCARD.imgH, C.line)
    c.rect(x + RCARD.pad, y + RCARD.h - RCARD.pad - RCARD.bar.h, (cw - 2 * RCARD.pad) * RCARD.bar.frac, RCARD.bar.h, C.dot)
  }
  c.text(RLABEL.x, RLABEL.y, RLABEL.label, C.text, LABEL_SCALE)
  const edge = { x: RWIN.x + w, y: RWIN.y + RWIN.h / 2 }
  if (k.phase === 'idle' || k.phase === 'rest') c.pointer(R_REST.x, R_REST.y)
  else if (k.phase === 'trigger') c.pointer(edge.x, edge.y, k.slot === CLICK_SLOT)
  else if (k.phase === 'hold' || k.slot === FIRST_EXIT) c.pointer(edge.x, edge.y)
}

// --- card-layout: a 3x2 grid of equal cards rises in row by row; the pointer hovers one and it lifts.

const CARDS_REST = { x: 229, y: 70 }
const CARDS_LABEL = { x: 16, y: 22, label: 'Cards' }
const CGRID = { x: 16, ys: [42, 100], cols: 3, pitch: 72, w: 64, h: 50 }
/** Card i starts at p = step*i and is fully in `span` later. */
const CSTAGGER = { step: 0.1, span: 0.5 }
const CRISE = 8
const CHOVER = { card: 1, from: 14, to: 25, lift: 3, shadow: { inset: 2, h: 3 } }
const CPOINTER_ON_CARD = { dx: 36, dy: 26 }

const cardLayout: Scene = (c, k) => {
  const { button } = stage.desktop(c, { button: 'Go', hover: k.phase === 'trigger', rows: 0, cards: 0 })
  c.text(CARDS_LABEL.x, CARDS_LABEL.y, CARDS_LABEL.label, C.text, TITLE_SCALE)
  if (loadTrigger(c, k, button, CARDS_REST)) return
  const hover = k.phase === 'hold' && inSlots(k, CHOVER.from, CHOVER.to)
  for (let i = 0; i < CGRID.cols * CGRID.ys.length; i++) {
    const pi = clamp01((k.p - CSTAGGER.step * i) / CSTAGGER.span)
    if (pi <= 0) continue
    const lifted = hover && i === CHOVER.card
    const x = CGRID.x + (i % CGRID.cols) * CGRID.pitch
    const y = CGRID.ys[Math.floor(i / CGRID.cols)]! + CRISE * (1 - pi) - (lifted ? CHOVER.lift : 0)
    if (lifted) c.rect(x + CHOVER.shadow.inset, y + CGRID.h + CHOVER.lift, CGRID.w - 2 * CHOVER.shadow.inset, CHOVER.shadow.h, C.shadow)
    card(c, x, y, CGRID.w, CGRID.h, pi, lifted ? blend8(C.bar, C.dot, 0.25) : C.bar)
    if (lifted) c.pointer(x + CPOINTER_ON_CARD.dx, y + CPOINTER_ON_CARD.dy)
  }
}

// --- bento-grid: tiles of three sizes snap into a 4-column grid; the 2x2 feature tile anchors the top-left corner.

const BENTO_REST = { x: 232, y: 140 }
const BGRID = { x: 16, y: 26, colW: 47, rowH: 37, gap: 6, r: 3 }
/** [col, row, colSpan, rowSpan]; tile 0 is the feature. */
const BTILES: readonly (readonly [number, number, number, number])[] = [
  [0, 0, 2, 2],
  [2, 0, 1, 1],
  [3, 0, 1, 1],
  [2, 1, 2, 1],
  [0, 2, 1, 1],
  [1, 2, 1, 1],
  [2, 2, 2, 1],
]
const BSTAGGER = { step: 0.07, span: 0.5 }
/** Tiles grow from this scale about their centre. */
const BSNAP = 0.6
const BFEATURE = { tint: 0.25, label: 'Bento', dx: 8, dy: 8, disc: { dx: 20, dy: 20, r: 12 } }
const BICON = { size: 8, pad: 6, colors: [C.accent2, C.dot, C.btn] }
const BBAR = { h: 3, frac: 0.5 }

const bentoGrid: Scene = (c, k) => {
  const { button } = stage.desktop(c, { button: 'Go', hover: k.phase === 'trigger', rows: 0, cards: 0 })
  if (loadTrigger(c, k, button, BENTO_REST)) return
  BTILES.forEach(([col, row, cs, rs], i) => {
    const pi = clamp01((k.p - BSTAGGER.step * i) / BSTAGGER.span)
    if (pi <= 0) return
    const s = BSNAP + (1 - BSNAP) * pi
    const fw = cs * BGRID.colW + (cs - 1) * BGRID.gap
    const fh = rs * BGRID.rowH + (rs - 1) * BGRID.gap
    const w = fw * s, h = fh * s
    const x = BGRID.x + col * (BGRID.colW + BGRID.gap) + (fw - w) / 2
    const y = BGRID.y + row * (BGRID.rowH + BGRID.gap) + (fh - h) / 2
    if (i === 0) {
      c.rrect(x, y, w, h, BGRID.r, fade(blend8(C.bar, C.btn, BFEATURE.tint), pi))
      c.text(x + BFEATURE.dx * s, y + BFEATURE.dy * s, BFEATURE.label, fade(C.text, pi), TITLE_SCALE * s)
      disc(c, x + w - BFEATURE.disc.dx * s, y + h - BFEATURE.disc.dy * s, BFEATURE.disc.r * s, fade(C.btn, pi))
      return
    }
    c.rrect(x, y, w, h, BGRID.r, fade(C.bar, pi))
    const pad = BICON.pad * s, icon = BICON.size * s
    c.rect(x + pad, y + pad, icon, icon, fade(BICON.colors[i % BICON.colors.length]!, pi))
    c.rect(x + pad, y + h - pad - BBAR.h * s, (w - 2 * pad) * BBAR.frac, BBAR.h * s, fade(C.dot, pi))
  })
}

// --- sidebar-layout: a fixed left nav slides in from the left and the content reflows beside it; clicking a nav row swaps the content.

const SB_REST = { x: 150, y: 120 }
const SB_W = 92
const SB_FILL = blend8(C.bg, C.bar, 0.5)
const SB_LABEL = { dx: 6, dy: 26, label: 'Sidebar' }
const SB_ROWS = { n: 5, y0: 50, pitch: 16, icon: { dx: 8, size: 6 }, bar: { dx: 20, w: 50, h: 3 }, pad: 6 }
const SB_ACCENT_W = 3
/** The pointer hovers row `row` from `hoverFrom`, clicks at `clickSlot`; the row stays current (and the content swapped) to the end of hold. */
const SB_SELECT = { row: 2, hoverFrom: 12, clickSlot: 14, hoverTo: 24 }
const SB_CONTENT = { pad: 12, headY: 30, head: { frac: 0.5, h: 6 }, bars: { ys: [44, 54, 64], fracs: [0.9, 0.7, 0.8], h: 3 }, cards: { y: 76, h: 44, gap: 8 } }
const SB_LIST = { y0: 50, pitch: 18, disc: { r: 3 }, bar: { dx: 10, frac: 0.55, h: 3 }, tail: { w: 14, h: 3 } }

const sidebarLayout: Scene = (c, k) => {
  const { button } = stage.desktop(c, { button: 'App', hover: k.phase === 'trigger', rows: 0, cards: 0 })
  const p = k.p
  const selected = k.phase === 'hold' && k.slot >= SB_SELECT.clickSlot
  const current = selected ? SB_SELECT.row : 0
  // Content beside the sidebar: the heading and either text + cards (view A) or a list (view B after the click).
  const cx = SB_CONTENT.pad + SB_W * p
  const cw = VIEW_W - cx - SB_CONTENT.pad
  c.rect(cx, SB_CONTENT.headY, cw * SB_CONTENT.head.frac, SB_CONTENT.head.h, C.text)
  if (!selected) {
    SB_CONTENT.bars.ys.forEach((y, i) => c.rect(cx, y, cw * SB_CONTENT.bars.fracs[i]!, SB_CONTENT.bars.h, C.line))
    const cardW = (cw - SB_CONTENT.cards.gap) / 2
    card(c, cx, SB_CONTENT.cards.y, cardW, SB_CONTENT.cards.h)
    card(c, cx + cardW + SB_CONTENT.cards.gap, SB_CONTENT.cards.y, cardW, SB_CONTENT.cards.h)
  } else
    for (let i = 0; i < 4; i++) {
      const y = SB_LIST.y0 + i * SB_LIST.pitch
      disc(c, cx + SB_LIST.disc.r, y + SB_LIST.bar.h / 2, SB_LIST.disc.r, C.accent2)
      c.rect(cx + SB_LIST.bar.dx, y, cw * SB_LIST.bar.frac, SB_LIST.bar.h, C.line)
      c.rect(cx + cw - SB_LIST.tail.w, y, SB_LIST.tail.w, SB_LIST.tail.h, C.dot)
    }
  if (loadTrigger(c, k, button, SB_REST)) return
  // Sidebar over the content, sliding in from the left.
  const sx = SB_W * (p - 1)
  c.rect(sx, BAR_H, SB_W, VIEW_H - BAR_H, SB_FILL)
  c.text(sx + SB_LABEL.dx, SB_LABEL.dy, SB_LABEL.label, C.text, LABEL_SCALE)
  for (let i = 0; i < SB_ROWS.n; i++) {
    const y = SB_ROWS.y0 + i * SB_ROWS.pitch
    if (i === current) {
      c.rect(sx, y - SB_ROWS.pad, SB_W, SB_ROWS.bar.h + 2 * SB_ROWS.pad, C.bar)
      c.rect(sx, y - SB_ROWS.pad, SB_ACCENT_W, SB_ROWS.bar.h + 2 * SB_ROWS.pad, C.btn)
    }
    c.rect(sx + SB_ROWS.icon.dx, y - (SB_ROWS.icon.size - SB_ROWS.bar.h) / 2, SB_ROWS.icon.size, SB_ROWS.icon.size, i === current ? C.text : C.dot)
    c.rect(sx + SB_ROWS.bar.dx, y, SB_ROWS.bar.w, SB_ROWS.bar.h, i === current ? C.text : C.dot)
  }
  if (k.phase === 'hold' && inSlots(k, SB_SELECT.hoverFrom, SB_SELECT.hoverTo))
    c.pointer(sx + SB_ROWS.bar.dx + SB_ROWS.bar.w / 2, SB_ROWS.y0 + SB_SELECT.row * SB_ROWS.pitch + 1, k.slot === SB_SELECT.clickSlot)
}

// --- sticky-header: the pointer drags the scrollbar; the page scrolls up under a header that stays pinned and gains a shadow.

const SH_REST = { x: 120, y: 148 }
const SH_HEADER: Rect = { x: 0, y: 20, w: VIEW_W, h: 22 }
const SH_LOGO = { x: 16, size: 10 }
const SH_LABEL = { x: 32, label: 'Nav' }
const SH_LINKS = { xs: [150, 172, 194], w: 14, h: 3 }
const SH_SHADOW_H = 4
/** Units the page scrolls over the enter phase. */
const SH_SCROLL = 70
const SH_PAGE = { x: 16, head: { y: 52, w: 120, h: 6 }, bars1: 66, cards: { y: 104, xs: [16, 84], w: 60, h: 40 }, bars2: 162 }
/** Pointer tip on the scrollbar thumb: thumb top y 20 + 100*pos, 24 tall. */
const SH_THUMB = { x: 234, y0: 30, travel: 100 }

const stickyHeader: Scene = (c, k) => {
  const p = k.p
  const off = SH_SCROLL * p
  c.rect(SH_PAGE.x, SH_PAGE.head.y - off, SH_PAGE.head.w, SH_PAGE.head.h, C.text)
  stage.textBars(c, SH_PAGE.x, SH_PAGE.bars1 - off, 3)
  for (const x of SH_PAGE.cards.xs) card(c, x, SH_PAGE.cards.y - off, SH_PAGE.cards.w, SH_PAGE.cards.h)
  stage.textBars(c, SH_PAGE.x, SH_PAGE.bars2 - off, 3)
  // Chrome over the scrolled page: browser bar, then the pinned header with its scroll shadow.
  c.rect(0, 0, VIEW_W, SH_HEADER.y + SH_HEADER.h, C.bg)
  stage.desktop(c, { rows: 0, cards: 0 })
  c.rect(SH_HEADER.x, SH_HEADER.y, SH_HEADER.w, SH_HEADER.h, C.bar)
  c.rrect(SH_LOGO.x, SH_HEADER.y + (SH_HEADER.h - SH_LOGO.size) / 2, SH_LOGO.size, SH_LOGO.size, 2, C.btn)
  c.text(SH_LABEL.x, SH_HEADER.y + (SH_HEADER.h - 7 * TITLE_SCALE) / 2, SH_LABEL.label, C.text, TITLE_SCALE)
  for (const x of SH_LINKS.xs) c.rect(x, SH_HEADER.y + (SH_HEADER.h - SH_LINKS.h) / 2, SH_LINKS.w, SH_LINKS.h, C.dot)
  if (p > 0) c.rect(0, SH_HEADER.y + SH_HEADER.h, VIEW_W, SH_SHADOW_H, blend8(C.bg, C.shadow, p))
  stage.scrollbar(c, p)
  if (k.phase === 'idle' || k.phase === 'rest') c.pointer(SH_REST.x, SH_REST.y)
  else if (k.phase === 'trigger') c.pointer(SH_THUMB.x, SH_THUMB.y0, k.slot === CLICK_SLOT)
  else if (k.phase === 'hold' || k.slot === FIRST_EXIT) c.pointer(SH_THUMB.x, SH_THUMB.y0 + SH_THUMB.travel * p)
}

// --- split-layout: two equal halves with a divider; text slides in from the left, a media panel from the right.

const SPLIT_REST = { x: 200, y: 148 }
const SPLIT_LABEL = { y: 22, label: 'Split' }
const SPLIT_DIVIDER = { x: VIEW_W / 2, y: 40, h: 110 }
/** Units each half travels from its side. */
const SPLIT_SLIDE = 60
const SPLIT_LEFT_X = 16
const SPLIT_HEAD = { y: 48, w: 80, h: 6 }
const SPLIT_BARS = { ys: [62, 70, 78, 86], ws: [88, 76, 84, 56], h: 3 }
const SPLIT_GHOST: Rect = { x: 16, y: 100, w: 40, h: 12 }
const SPLIT_MEDIA: Rect = { x: 136, y: 40, w: 88, h: 96 }

const splitLayout: Scene = (c, k) => {
  const { button } = stage.desktop(c, { button: 'Go', hover: k.phase === 'trigger', rows: 0, cards: 0 })
  if (loadTrigger(c, k, button, SPLIT_REST)) return
  const p = k.p
  c.text((VIEW_W - textWidth(SPLIT_LABEL.label, LABEL_SCALE)) / 2, SPLIT_LABEL.y, SPLIT_LABEL.label, fade(C.text, p), LABEL_SCALE)
  c.vline(SPLIT_DIVIDER.x, SPLIT_DIVIDER.y, SPLIT_DIVIDER.h, fade(C.line, p))
  const lx = SPLIT_LEFT_X - SPLIT_SLIDE * (1 - p)
  c.rect(lx, SPLIT_HEAD.y, SPLIT_HEAD.w, SPLIT_HEAD.h, fade(C.text, p))
  SPLIT_BARS.ys.forEach((y, i) => c.rect(lx, y, SPLIT_BARS.ws[i]!, SPLIT_BARS.h, fade(C.line, p)))
  c.rrect(lx + SPLIT_GHOST.x - SPLIT_LEFT_X, SPLIT_GHOST.y, SPLIT_GHOST.w, SPLIT_GHOST.h, 3, C.bg, fade(C.dot, p))
  media(c, SPLIT_MEDIA.x + SPLIT_SLIDE * (1 - p), SPLIT_MEDIA.y, SPLIT_MEDIA.w, SPLIT_MEDIA.h, p)
}

export const LAYOUT: Readonly<Record<string, Scene>> = {
  'hero-section': heroSection,
  'responsive-layout': responsiveLayout,
  'card-layout': cardLayout,
  'bento-grid': bentoGrid,
  'sidebar-layout': sidebarLayout,
  'sticky-header': stickyHeader,
  'split-layout': splitLayout,
}
