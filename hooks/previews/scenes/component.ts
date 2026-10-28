// Component scenes (10 ids). `drawer` is the reference scene: every number named, motion a pure function of k.p,
// pointer/keycap only in idle, trigger, hold and the first exit slot so pointer-free enter and exit frames dedupe.
import type { Canvas, Keyframe, Rect, Scene } from '../canvas'
import { blend8, C, inSlots, KEYCAP_H, keycapWidth, PHASES, stage, VIEW_H, VIEW_W } from '../canvas'
import { textWidth } from '../font5x7'
import { atRest, CLICK_SLOT, FIRST_EXIT, LABEL_SCALE, POINTER_ON_BUTTON, TEXT_BAR_H, TITLE_SCALE } from './shared'

const HOLD_LEN = PHASES.hold[1] - PHASES.hold[0]

/** Pointer, touch and keycap may appear only in these slots; enter and exit frames stay actor-free so they dedupe. */
const showsActor = (k: Keyframe): boolean => k.phase === 'hold' || k.slot === FIRST_EXIT
/** 0..1 across the hold, for hold-only motion (progress lines, shimmer); hold frames never dedupe anyway. */
const holdT = (k: Keyframe): number => (k.slot - PHASES.hold[0]) / HOLD_LEN

/** `rect` clipped to `clip`; slides and unrolling lists stay inside their frame. */
function clipRect(c: Canvas, clip: Rect, x: number, y: number, w: number, h: number, color: number): void {
  const x0 = Math.max(x, clip.x), y0 = Math.max(y, clip.y)
  const x1 = Math.min(x + w, clip.x + clip.w), y1 = Math.min(y + h, clip.y + clip.h)
  if (x1 > x0 && y1 > y0) c.rect(x0, y0, x1 - x0, y1 - y0, color)
}

const CHEVRON_HALF = 3
const CHEVRON_DOT = 1.5
/** 7-wide chevron centred on (cx, cy): `p` 0 points down, 1 points up, between is the rotation. */
function chevron(c: Canvas, cx: number, cy: number, p: number, color: number): void {
  const dir = 1 - 2 * p
  for (let i = 0; i <= CHEVRON_HALF; i++) {
    const y = cy + dir * (i - CHEVRON_HALF / 2) - CHEVRON_DOT / 2
    c.rect(cx - CHEVRON_HALF + i - CHEVRON_DOT / 2, y, CHEVRON_DOT, CHEVRON_DOT, color)
    c.rect(cx + CHEVRON_HALF - i - CHEVRON_DOT / 2, y, CHEVRON_DOT, CHEVRON_DOT, color)
  }
}

/** Small filled button with a centred scale-1 label. */
function button(c: Canvas, r: Rect, label: string, fill: number, ink: number, stroke?: number): void {
  c.rrect(r.x, r.y, r.w, r.h, 3, fill, stroke)
  c.text(r.x + (r.w - textWidth(label)) / 2, r.y + (r.h - 7) / 2, label, ink)
}

// --- drawer: a panel slides in from the right over the dimmed page; Esc closes it.

const DRAWER_W = 100
const DRAWER_SHADOW_W = 3
const DRAWER_CLOSE = { dx: 6, dy: 6, label: 'X' }
const DRAWER_TITLE = { dx: 24, dy: 6, label: 'Drawer' }
/** Menu rows: row 0 is the active one (accent), the rest are text bars. */
const DRAWER_ROWS = { dx: 14, w: 70, h: 3, ys: [30, 44, 58, 72] }
/** Hold slots where the pointer rests on a row, which highlights it. */
const DRAWER_HOVER = { row: 1, from: 15, to: 24 }
const DRAWER_HOVER_PAD = 4
const DRAWER_HOVER_ACCENT_W = 2
const DRAWER_KEYCAP = { label: 'ESC', margin: 6 }
/** Where the pointer waits before and after the interaction. */
const DRAWER_REST = { x: 150, y: 100 }

/** Draws the panel at its position for `k.p` (0 = off-screen right, 1 = open); returns its left edge. */
function drawerPanel(c: Canvas, k: Keyframe, hover: boolean): number {
  const x = VIEW_W - DRAWER_W * k.p
  c.rect(x - DRAWER_SHADOW_W, 0, DRAWER_SHADOW_W, VIEW_H, C.shadow)
  c.rect(x, 0, DRAWER_W, VIEW_H, C.panel)
  c.text(x + DRAWER_CLOSE.dx, DRAWER_CLOSE.dy, DRAWER_CLOSE.label, C.handle, LABEL_SCALE)
  c.text(x + DRAWER_TITLE.dx, DRAWER_TITLE.dy, DRAWER_TITLE.label, C.ink, LABEL_SCALE)
  DRAWER_ROWS.ys.forEach((y, i) => {
    if (hover && i === DRAWER_HOVER.row) {
      const top = y - DRAWER_HOVER_PAD, h = DRAWER_ROWS.h + 2 * DRAWER_HOVER_PAD
      c.rect(x, top, DRAWER_W, h, blend8(C.panel, C.panelLine, 0.5))
      c.rect(x, top, DRAWER_HOVER_ACCENT_W, h, C.btn)
    }
    c.rect(x + DRAWER_ROWS.dx, y, DRAWER_ROWS.w, DRAWER_ROWS.h, i === 0 ? C.btn : C.panelLine)
  })
  return x
}

const drawer: Scene = (c, k) => {
  const { button: b } = stage.desktop(c, { button: 'Menu', hover: k.phase === 'trigger' })
  if (atRest(k)) {
    c.pointer(DRAWER_REST.x, DRAWER_REST.y)
    return
  }
  if (k.phase === 'trigger') {
    c.pointer(b.x + POINTER_ON_BUTTON.dx, b.y + POINTER_ON_BUTTON.dy, k.slot === CLICK_SLOT)
    return
  }
  // enter, hold, exit: the page dims and the panel follows p.
  c.dim(k.p)
  const firstExit = k.slot === FIRST_EXIT
  const hover = k.phase === 'hold' && inSlots(k, DRAWER_HOVER.from, DRAWER_HOVER.to)
  const x = drawerPanel(c, k, hover)
  if (showsActor(k)) {
    const w = keycapWidth(DRAWER_KEYCAP.label)
    c.keycap(x + DRAWER_W - w - DRAWER_KEYCAP.margin, VIEW_H - KEYCAP_H - DRAWER_KEYCAP.margin, DRAWER_KEYCAP.label)
  }
  if (hover) c.pointer(x + DRAWER_ROWS.dx + DRAWER_ROWS.w / 2, DRAWER_ROWS.ys[DRAWER_HOVER.row]! + 1)
  if (firstExit) c.pointer(x + DRAWER_CLOSE.dx + 2 * LABEL_SCALE, DRAWER_CLOSE.dy + 3 * LABEL_SCALE, true)
}

// --- tabs: three tabs; clicking the second slides the underline over and swipes the panel content.

const TABS_TITLE = { x: 16, y: 24, label: 'Tabs' }
const TAB = { y: 46, w: 56, h: 14, xs: [16, 80, 144], labels: ['Home', 'Stats', 'Help'] }
const TAB_LABEL = { dx: 6, dy: 3 }
const TAB_UNDERLINE_H = 3
const TAB_BASELINE_Y = TAB.y + TAB.h
const TAB_PANEL: Rect = { x: 16, y: 68, w: 208, h: 84 }
/** Panel 1: text bars. Panel 2: an image block with bars beside it. */
const TAB_PANEL_BARS = { dy: 6, pitch: 12, widths: [160, 120, 140, 100] }
const TAB_PANEL_IMAGE = { dx: 0, dy: 6, w: 80, h: 50 }
const TAB_PANEL_SIDE = { dx: 92, dy: 10, pitch: 12, widths: [100, 70, 90] }
const TABS_REST = { x: 150, y: 130 }
const TABS_POINTER_DY = 7

const tabs: Scene = (c, k) => {
  stage.desktop(c, { rows: 0, cards: 0 })
  c.text(TABS_TITLE.x, TABS_TITLE.y, TABS_TITLE.label, C.text, TITLE_SCALE)
  const active = k.p < 0.5 ? 0 : 1
  TAB.xs.forEach((x, i) => c.text(x + TAB_LABEL.dx, TAB.y + TAB_LABEL.dy, TAB.labels[i]!, i === active ? C.white : C.dot))
  c.rect(TAB.xs[0]!, TAB_BASELINE_Y, TAB_PANEL.w, 1, C.line)
  c.rect(TAB.xs[0]! + (TAB.xs[1]! - TAB.xs[0]!) * k.p, TAB_BASELINE_Y - TAB_UNDERLINE_H + 1, TAB.w, TAB_UNDERLINE_H, C.btn)
  // Panels swipe left together: panel 1 leaves as panel 2 arrives.
  const shift = TAB_PANEL.w * k.p
  TAB_PANEL_BARS.widths.forEach((w, i) =>
    clipRect(c, TAB_PANEL, TAB_PANEL.x - shift, TAB_PANEL.y + TAB_PANEL_BARS.dy + i * TAB_PANEL_BARS.pitch, w, TEXT_BAR_H, C.line),
  )
  const x2 = TAB_PANEL.x + TAB_PANEL.w - shift
  clipRect(c, TAB_PANEL, x2 + TAB_PANEL_IMAGE.dx, TAB_PANEL.y + TAB_PANEL_IMAGE.dy, TAB_PANEL_IMAGE.w, TAB_PANEL_IMAGE.h, C.bar)
  TAB_PANEL_SIDE.widths.forEach((w, i) =>
    clipRect(c, TAB_PANEL, x2 + TAB_PANEL_SIDE.dx, TAB_PANEL.y + TAB_PANEL_SIDE.dy + i * TAB_PANEL_SIDE.pitch, w, TEXT_BAR_H, C.dot),
  )
  if (atRest(k)) c.pointer(TABS_REST.x, TABS_REST.y)
  else if (k.phase === 'trigger' || k.phase === 'hold') c.pointer(TAB.xs[1]! + TAB.w / 2, TAB.y + TABS_POINTER_DY, k.slot === CLICK_SLOT)
  else if (k.slot === FIRST_EXIT) c.pointer(TAB.xs[0]! + TAB.w / 2, TAB.y + TABS_POINTER_DY, true)
}

// --- accordion: stacked FAQ rows; clicking the second expands its body and turns the chevron.

const FAQ_TITLE = { x: 16, y: 24, label: 'FAQ' }
const FAQ_ROW = { x: 16, w: 208, h: 16, ys: [46, 66, 86], gap: 4 }
const FAQ_QUESTION = { dx: 8, dy: 6, widths: [90, 110, 70], h: 4 }
const FAQ_CHEVRON = { dx: 196, dy: 8 }
const FAQ_OPEN = 1
const FAQ_BODY_H = 30
const FAQ_BODY = { dy: 6, pitch: 10, dx: 8, widths: [180, 140] }
const FAQ_REST = { x: 150, y: 140 }

const accordion: Scene = (c, k) => {
  stage.desktop(c, { rows: 0, cards: 0 })
  c.text(FAQ_TITLE.x, FAQ_TITLE.y, FAQ_TITLE.label, C.text, TITLE_SCALE)
  const bodyH = FAQ_BODY_H * k.p
  FAQ_ROW.ys.forEach((y0, i) => {
    const y = i > FAQ_OPEN ? y0 + bodyH : y0
    const open = i === FAQ_OPEN
    c.rrect(FAQ_ROW.x, y, FAQ_ROW.w, FAQ_ROW.h, 2, C.bar)
    c.rect(FAQ_ROW.x + FAQ_QUESTION.dx, y + FAQ_QUESTION.dy, FAQ_QUESTION.widths[i]!, FAQ_QUESTION.h, open && k.p > 0 ? C.text : C.dot)
    chevron(c, FAQ_ROW.x + FAQ_CHEVRON.dx, y + FAQ_CHEVRON.dy, open ? k.p : 0, open && k.p > 0 ? C.btn : C.text)
    if (open && bodyH > 0) {
      const body: Rect = { x: FAQ_ROW.x, y: y + FAQ_ROW.h, w: FAQ_ROW.w, h: bodyH - FAQ_ROW.gap }
      c.rect(body.x, body.y, body.w, body.h, blend8(C.bg, C.bar, 0.5))
      FAQ_BODY.widths.forEach((w, j) => clipRect(c, body, body.x + FAQ_BODY.dx, body.y + FAQ_BODY.dy + j * FAQ_BODY.pitch, w, TEXT_BAR_H, C.line))
    }
  })
  const header = { x: FAQ_ROW.x + FAQ_ROW.w / 2, y: FAQ_ROW.ys[FAQ_OPEN]! + FAQ_ROW.h / 2 }
  if (atRest(k)) c.pointer(FAQ_REST.x, FAQ_REST.y)
  else if (k.phase === 'trigger' || k.phase === 'hold') c.pointer(header.x, header.y, k.slot === CLICK_SLOT)
  else if (k.slot === FIRST_EXIT) c.pointer(header.x, header.y, true)
}

// --- modal: a centred dialog grows from the middle over a page dimmed on all four sides; Cancel or Esc closes it.

const MODAL_OPEN: Rect = { x: 16, y: 78, w: 44, h: 12 }
const MODAL_REST = { x: 60, y: 130 }
const MODAL_DIM_GAIN = 1.2
const MODAL = { w: 140, h: 90, r: 6, minScale: 0.9 }
const MODAL_CENTER = { x: VIEW_W / 2, y: VIEW_H / 2 }
const MODAL_TITLE = { dx: 8, dy: 8, label: 'Modal' }
const MODAL_CLOSE = { dxFromRight: 20, dy: 8, label: 'X' }
const MODAL_BARS = { dx: 8, ys: [32, 42], widths: [100, 72] }
const MODAL_OK = { w: 28, h: 12, margin: 8, label: 'OK' }
const MODAL_CANCEL = { w: 40, gap: 6, label: 'Cancel' }
const MODAL_HOVER_OK = { from: 17, to: 24 }
const MODAL_KEYCAP = { label: 'ESC', margin: 6 }

const modal: Scene = (c, k) => {
  stage.desktop(c, { rows: 3, cards: 0 })
  button(c, MODAL_OPEN, 'Open', k.phase === 'trigger' ? blend8(C.btn, C.white, 0.25) : C.btn, C.white)
  if (atRest(k)) {
    c.pointer(MODAL_REST.x, MODAL_REST.y)
    return
  }
  if (k.phase === 'trigger') {
    c.pointer(MODAL_OPEN.x + 20, MODAL_OPEN.y + 5, k.slot === CLICK_SLOT)
    return
  }
  c.dim(Math.min(1, MODAL_DIM_GAIN * k.p))
  const s = MODAL.minScale + (1 - MODAL.minScale) * k.p
  const fade = (col: number): number => blend8(C.shadow, col, k.p)
  const w = MODAL.w * s, h = MODAL.h * s
  const x = MODAL_CENTER.x - w / 2, y = MODAL_CENTER.y - h / 2
  c.rrect(x, y, w, h, MODAL.r * s, fade(C.panel))
  c.text(x + MODAL_TITLE.dx * s, y + MODAL_TITLE.dy * s, MODAL_TITLE.label, fade(C.ink), TITLE_SCALE * s)
  c.text(x + w - MODAL_CLOSE.dxFromRight * s, y + MODAL_CLOSE.dy * s, MODAL_CLOSE.label, fade(C.handle), TITLE_SCALE * s)
  MODAL_BARS.ys.forEach((by, i) => c.rect(x + MODAL_BARS.dx * s, y + by * s, MODAL_BARS.widths[i]! * s, TEXT_BAR_H * s, fade(C.panelLine)))
  const by = y + h - (MODAL_OK.margin + MODAL_OK.h) * s
  const ok: Rect = { x: x + w - (MODAL_OK.margin + MODAL_OK.w) * s, y: by, w: MODAL_OK.w * s, h: MODAL_OK.h * s }
  const cancel: Rect = { x: ok.x - (MODAL_CANCEL.gap + MODAL_CANCEL.w) * s, y: by, w: MODAL_CANCEL.w * s, h: MODAL_OK.h * s }
  button(c, cancel, MODAL_CANCEL.label, fade(C.panel), fade(C.ink), fade(C.panelLine))
  button(c, ok, MODAL_OK.label, fade(C.btn), fade(C.white))
  if (showsActor(k)) c.keycap(MODAL_KEYCAP.margin, VIEW_H - KEYCAP_H - MODAL_KEYCAP.margin, MODAL_KEYCAP.label)
  if (k.phase === 'hold' && inSlots(k, MODAL_HOVER_OK.from, MODAL_HOVER_OK.to)) c.pointer(ok.x + ok.w / 2, ok.y + ok.h / 2)
  if (k.slot === FIRST_EXIT) c.pointer(cancel.x + cancel.w / 2, cancel.y + cancel.h / 2, true)
}

// --- bottom-sheet: on a phone, a sheet with a grab handle slides up from the bottom edge; a tap outside closes it.

const PHONE_INSET = 4
const SHEET_PAGE_BARS = { dx: 8, dy: 26, pitch: 12, widths: [60, 44, 52] }
const SHEET_SHARE: Rect = { x: 100, y: 130, w: 40, h: 12 }
const SHEET_TOUCH_REST = { x: 120, y: 100 }
const SHEET = { h: 88, r: 8 }
const SHEET_HANDLE = { w: 24, h: 3, dy: 4 }
const SHEET_TITLE = { dx: 8, dy: 12, label: 'Sheet' }
const SHEET_ROWS = { dx: 8, dys: [36, 52, 68], icon: 8, barDx: 14, barW: 50, barH: 3, icons: [C.btn, C.accent2, C.handle] }
/** Hold slots where a finger on the handle nudges the sheet up. */
const SHEET_NUDGE = { slots: [16, 17, 22, 23], dy: -4 }
const SHEET_CLOSE_TAP = { x: 120, y: 40 }

const bottomSheet: Scene = (c, k) => {
  const { screen } = stage.phone(c)
  SHEET_PAGE_BARS.widths.forEach((w, i) => c.rect(screen.x + SHEET_PAGE_BARS.dx, screen.y + SHEET_PAGE_BARS.dy + i * SHEET_PAGE_BARS.pitch, w, TEXT_BAR_H, C.line))
  button(c, SHEET_SHARE, 'Share', k.phase === 'trigger' ? blend8(C.btn, C.white, 0.25) : C.btn, C.white)
  if (atRest(k)) {
    c.touch(SHEET_TOUCH_REST.x, SHEET_TOUCH_REST.y)
    return
  }
  if (k.phase === 'trigger') {
    c.touch(SHEET_SHARE.x + SHEET_SHARE.w / 2, SHEET_SHARE.y + SHEET_SHARE.h / 2, k.slot === CLICK_SLOT)
    return
  }
  // Dim, then repaint the strips beside the phone so only the screen darkens.
  c.dim(k.p)
  const phoneX = screen.x - PHONE_INSET, phoneW = screen.w + 2 * PHONE_INSET
  c.rect(0, 0, phoneX, VIEW_H, C.bg)
  c.rect(phoneX + phoneW, 0, VIEW_W - phoneX - phoneW, VIEW_H, C.bg)
  const nudge = k.phase === 'hold' && SHEET_NUDGE.slots.includes(k.slot)
  const y = screen.y + screen.h - SHEET.h * k.p + (nudge ? SHEET_NUDGE.dy : 0)
  c.rrect(screen.x, y, screen.w, SHEET.h + (nudge ? -SHEET_NUDGE.dy : 0), SHEET.r, C.panel)
  const handleX = screen.x + (screen.w - SHEET_HANDLE.w) / 2
  c.rrect(handleX, y + SHEET_HANDLE.dy, SHEET_HANDLE.w, SHEET_HANDLE.h, 1.5, C.handle)
  c.text(screen.x + SHEET_TITLE.dx, y + SHEET_TITLE.dy, SHEET_TITLE.label, C.ink, LABEL_SCALE)
  SHEET_ROWS.dys.forEach((dy, i) => {
    c.rrect(screen.x + SHEET_ROWS.dx, y + dy, SHEET_ROWS.icon, SHEET_ROWS.icon, 2, SHEET_ROWS.icons[i]!)
    c.rect(screen.x + SHEET_ROWS.dx + SHEET_ROWS.barDx, y + dy + (SHEET_ROWS.icon - SHEET_ROWS.barH) / 2, SHEET_ROWS.barW, SHEET_ROWS.barH, C.panelLine)
  })
  if (nudge) c.touch(handleX + SHEET_HANDLE.w / 2, y + SHEET_HANDLE.dy + SHEET_HANDLE.h / 2)
  if (k.slot === FIRST_EXIT) c.touch(SHEET_CLOSE_TAP.x, SHEET_CLOSE_TAP.y, true)
}

// --- dropdown: clicking a `Select` button unrolls a list below it; the pointer highlights a row and picks it.

const DD_BUTTON: Rect = { x: 16, y: 32, w: 96, h: 18 }
const DD_LABEL = { dx: 6, dy: 2, label: 'Select' }
const DD_CARET = { dxFromRight: 10, dy: 9 }
const DD_LIST = { y: DD_BUTTON.y + DD_BUTTON.h + 2, rows: 4, rowH: 14, barDx: 8, barDy: 5, barWidths: [40, 52, 34, 46] }
const DD_HOVER = { row: 1, from: 14 }
const DD_REST = { x: 150, y: 130 }

const dropdown: Scene = (c, k) => {
  stage.desktop(c, { rows: 0, cards: 0 })
  c.rrect(DD_BUTTON.x, DD_BUTTON.y, DD_BUTTON.w, DD_BUTTON.h, 3, k.phase === 'trigger' ? blend8(C.panel, C.panelLine, 0.5) : C.panel)
  c.text(DD_BUTTON.x + DD_LABEL.dx, DD_BUTTON.y + DD_LABEL.dy, DD_LABEL.label, C.ink, LABEL_SCALE)
  chevron(c, DD_BUTTON.x + DD_BUTTON.w - DD_CARET.dxFromRight, DD_BUTTON.y + DD_CARET.dy, k.p, C.ink)
  const listH = DD_LIST.rows * DD_LIST.rowH * k.p
  const list: Rect = { x: DD_BUTTON.x, y: DD_LIST.y, w: DD_BUTTON.w, h: listH }
  const hover = k.phase === 'hold' ? k.slot >= DD_HOVER.from : k.slot === FIRST_EXIT
  if (listH > 0) {
    c.rrect(list.x, list.y, list.w, list.h, 3, C.panel)
    for (let i = 0; i < DD_LIST.rows; i++) {
      const ry = list.y + i * DD_LIST.rowH
      if (hover && i === DD_HOVER.row) clipRect(c, list, list.x, ry, list.w, DD_LIST.rowH, blend8(C.panel, C.btn, 0.25))
      clipRect(c, list, list.x + DD_LIST.barDx, ry + DD_LIST.barDy, DD_LIST.barWidths[i]!, TEXT_BAR_H, hover && i === DD_HOVER.row ? C.btn : C.panelLine)
    }
  }
  const hoverPt = { x: list.x + list.w / 2, y: list.y + DD_HOVER.row * DD_LIST.rowH + DD_LIST.rowH / 2 }
  if (atRest(k)) c.pointer(DD_REST.x, DD_REST.y)
  else if (k.phase === 'trigger') c.pointer(DD_BUTTON.x + DD_BUTTON.w / 2, DD_BUTTON.y + DD_BUTTON.h / 2, k.slot === CLICK_SLOT)
  else if (hover) c.pointer(hoverPt.x, hoverPt.y, k.slot === FIRST_EXIT)
}

// --- tooltip: the pointer rests on an icon; after a delay a small dark bubble with a tail fades in above it.

const TIP_ICONS = { y: 92, size: 16, xs: [88, 112, 136], glyphs: ['+', 'i', '?'] }
const TIP_TARGET = 1
const TIP_BUBBLE = { w: 46, h: 20, gap: 8, rise: 4, label: 'Tip' }
const TIP_TAIL_ROWS = [6, 4, 2]
const TIP_REST = { x: 170, y: 130 }
const TIP_POINTER = { dx: 2, dy: 2 }

const tooltip: Scene = (c, k) => {
  stage.desktop(c, { rows: 3, cards: 0 })
  const hot = !atRest(k) && k.phase !== 'exit' || k.slot === FIRST_EXIT
  TIP_ICONS.xs.forEach((x, i) => {
    const hover = hot && i === TIP_TARGET
    c.rrect(x, TIP_ICONS.y, TIP_ICONS.size, TIP_ICONS.size, 4, hover ? C.line : C.bar)
    c.text(x + (TIP_ICONS.size - textWidth(TIP_ICONS.glyphs[i]!, LABEL_SCALE)) / 2, TIP_ICONS.y + 1, TIP_ICONS.glyphs[i]!, C.text, LABEL_SCALE)
  })
  if (k.p > 0) {
    const fade = (col: number): number => blend8(C.bg, col, k.p)
    const cx = TIP_ICONS.xs[TIP_TARGET]! + TIP_ICONS.size / 2
    const y = TIP_ICONS.y - TIP_BUBBLE.gap - TIP_BUBBLE.h + TIP_BUBBLE.rise * (1 - k.p)
    c.rrect(cx - TIP_BUBBLE.w / 2, y, TIP_BUBBLE.w, TIP_BUBBLE.h, 3, fade(C.ink))
    TIP_TAIL_ROWS.forEach((w, i) => c.rect(cx - w / 2, y + TIP_BUBBLE.h + i, w, 1, fade(C.ink)))
    c.text(cx - textWidth(TIP_BUBBLE.label, LABEL_SCALE) / 2, y + 3, TIP_BUBBLE.label, fade(C.white), LABEL_SCALE)
  }
  if (atRest(k) || k.slot === FIRST_EXIT) c.pointer(TIP_REST.x, TIP_REST.y)
  else if (k.phase === 'trigger' || k.phase === 'hold') c.pointer(TIP_ICONS.xs[TIP_TARGET]! + TIP_ICONS.size / 2 + TIP_POINTER.dx, TIP_ICONS.y + TIP_ICONS.size / 2 + TIP_POINTER.dy)
}

// --- toast: after a click, a small notice slides in at the top-right, its timer line shrinks, then it slides out.

const TOAST: Rect = { x: VIEW_W - 8 - 84, y: 24, w: 84, h: 24 }
const TOAST_TRAVEL = 100
const TOAST_STRIPE = { dx: 2, dy: 4, w: 3 }
const TOAST_LABEL = { dx: 10, dy: 4, label: 'Saved' }
/** The timer line steps every `step` slots: 10 distinct hold frames keep the id under the 30 KB budget. */
const TOAST_TIMER = { dx: 10, h: 2, bottom: 3, step: 2 }
const TOAST_REST = { x: 150, y: 120 }

const toast: Scene = (c, k) => {
  const { button: b } = stage.desktop(c, { button: 'Save', hover: k.phase === 'trigger' })
  if (k.p > 0) {
    const x = TOAST.x + TOAST_TRAVEL * (1 - k.p)
    c.rrect(x, TOAST.y, TOAST.w, TOAST.h, 3, C.panel)
    c.rect(x + TOAST_STRIPE.dx, TOAST.y + TOAST_STRIPE.dy, TOAST_STRIPE.w, TOAST.h - 2 * TOAST_STRIPE.dy, C.btn)
    c.text(x + TOAST_LABEL.dx, TOAST.y + TOAST_LABEL.dy, TOAST_LABEL.label, C.ink, LABEL_SCALE)
    if (k.phase === 'hold') {
      const elapsed = Math.floor((k.slot - PHASES.hold[0]) / TOAST_TIMER.step) * TOAST_TIMER.step / HOLD_LEN
      const w = (TOAST.w - 2 * TOAST_TIMER.dx) * (1 - elapsed)
      c.rect(x + TOAST_TIMER.dx, TOAST.y + TOAST.h - TOAST_TIMER.bottom - TOAST_TIMER.h, w, TOAST_TIMER.h, C.btn)
    }
  }
  if (k.phase === 'trigger') c.pointer(b.x + POINTER_ON_BUTTON.dx, b.y + POINTER_ON_BUTTON.dy, k.slot === CLICK_SLOT)
  else if (atRest(k) || showsActor(k)) c.pointer(TOAST_REST.x, TOAST_REST.y)
}

// --- carousel: one slide fills the frame; clicking the next arrow slides it out left as the next comes in, and the dots move.

const SLIDE_FRAME: Rect = { x: 30, y: 28, w: 180, h: 92 }
const SLIDE1 = { fill: C.hills, sun: { dx: 130, dy: 14, size: 14 }, ground: { dy: 62, h: 30 } }
const SLIDE2 = { fill: C.bar, image: { dx: 16, dy: 14, w: 70, h: 46 }, bars: { dx: 100, dys: [20, 32, 44], widths: [60, 44, 52] } }
const ARROW = { y: 66, size: 16, prevX: 8, nextX: 216, labels: ['<', '>'] }
const DOTS = { y: 128, pitch: 10, size: 4, count: 3 }
const CAROUSEL_LABEL = { y: 138, label: 'Carousel' }
const CAROUSEL_REST = { x: 200, y: 145 }

function arrow(c: Canvas, x: number, label: string, hot: boolean): void {
  c.rrect(x, ARROW.y, ARROW.size, ARROW.size, ARROW.size / 2, hot ? C.line : C.bar)
  c.text(x + (ARROW.size - textWidth(label, LABEL_SCALE)) / 2, ARROW.y + 1, label, C.text, LABEL_SCALE)
}

const carousel: Scene = (c, k) => {
  stage.desktop(c, { rows: 0, cards: 0 })
  const f = SLIDE_FRAME
  const x1 = f.x - f.w * k.p, x2 = x1 + f.w
  clipRect(c, f, x1, f.y, f.w, f.h, SLIDE1.fill)
  clipRect(c, f, x1, f.y + SLIDE1.ground.dy, f.w, SLIDE1.ground.h, blend8(C.hills, C.text, 0.25))
  clipRect(c, f, x1 + SLIDE1.sun.dx, f.y + SLIDE1.sun.dy, SLIDE1.sun.size, SLIDE1.sun.size, C.accent2)
  clipRect(c, f, x2, f.y, f.w, f.h, SLIDE2.fill)
  clipRect(c, f, x2 + SLIDE2.image.dx, f.y + SLIDE2.image.dy, SLIDE2.image.w, SLIDE2.image.h, C.btn)
  SLIDE2.bars.dys.forEach((dy, i) => clipRect(c, f, x2 + SLIDE2.bars.dx, f.y + dy, SLIDE2.bars.widths[i]!, TEXT_BAR_H, C.dot))
  const next = k.phase === 'trigger' || k.phase === 'hold'
  arrow(c, ARROW.prevX, ARROW.labels[0]!, k.slot === FIRST_EXIT)
  arrow(c, ARROW.nextX, ARROW.labels[1]!, next)
  const active = k.p < 0.5 ? 0 : 1
  const dotsX = VIEW_W / 2 - ((DOTS.count - 1) * DOTS.pitch) / 2
  for (let i = 0; i < DOTS.count; i++) c.rrect(dotsX + i * DOTS.pitch - DOTS.size / 2, DOTS.y, DOTS.size, DOTS.size, DOTS.size / 2, i === active ? C.btn : C.dot)
  c.text((VIEW_W - textWidth(CAROUSEL_LABEL.label, TITLE_SCALE)) / 2, CAROUSEL_LABEL.y, CAROUSEL_LABEL.label, C.text, TITLE_SCALE)
  if (atRest(k)) c.pointer(CAROUSEL_REST.x, CAROUSEL_REST.y)
  else if (next) c.pointer(ARROW.nextX + ARROW.size / 2, ARROW.y + ARROW.size / 2, k.slot === CLICK_SLOT)
  else if (k.slot === FIRST_EXIT) c.pointer(ARROW.prevX + ARROW.size / 2, ARROW.y + ARROW.size / 2, true)
}

// --- skeleton: a reload swaps the content for grey placeholder blocks that shimmer, then the real text and image return.

const SKEL_IMAGE: Rect = { x: 16, y: 30, w: 208, h: 56 }
const SKEL_SUN = { x: 190, y: 40, size: 14 }
const SKEL_GROUND = { dy: 36, h: 20 }
const SKEL_TITLE: Rect = { x: 16, y: 96, w: 120, h: 6 }
const SKEL_BARS: Rect[] = [{ x: 16, y: 110, w: 208, h: 4 }, { x: 16, y: 120, w: 160, h: 4 }]
const SKEL_LABEL = { x: 16, y: 134, label: 'Loading' }
/** Shimmer band: outer and inner stripes, sweeping across all blocks `sweeps` times per hold; `phase` puts it mid-image at the hold's centre slot. */
const SHIMMER = { w: 40, inner: 16, sweeps: 2, phase: 0.5 }
const SKEL_REST = { x: 180, y: 140 }

const skeleton: Scene = (c, k) => {
  const { button: b } = stage.desktop(c, { button: 'Load', hover: k.phase === 'trigger', rows: 0, cards: 0 })
  const grey = (col: number): number => blend8(col, C.bar, k.p)
  c.rrect(SKEL_IMAGE.x, SKEL_IMAGE.y, SKEL_IMAGE.w, SKEL_IMAGE.h, 4, grey(C.hills))
  clipRect(c, SKEL_IMAGE, SKEL_IMAGE.x, SKEL_IMAGE.y + SKEL_GROUND.dy, SKEL_IMAGE.w, SKEL_GROUND.h, grey(blend8(C.hills, C.text, 0.25)))
  c.rrect(SKEL_SUN.x, SKEL_SUN.y, SKEL_SUN.size, SKEL_SUN.size, SKEL_SUN.size / 2, grey(C.accent2))
  c.rect(SKEL_TITLE.x, SKEL_TITLE.y, SKEL_TITLE.w, SKEL_TITLE.h, grey(C.text))
  for (const r of SKEL_BARS) c.rect(r.x, r.y, r.w, r.h, grey(C.line))
  if (k.phase === 'hold') {
    const u = (holdT(k) * SHIMMER.sweeps + SHIMMER.phase) % 1
    const bx = SKEL_IMAGE.x - SHIMMER.w + u * (SKEL_IMAGE.w + SHIMMER.w)
    const pad = (SHIMMER.w - SHIMMER.inner) / 2
    for (const r of [SKEL_IMAGE, SKEL_TITLE, ...SKEL_BARS]) {
      clipRect(c, r, bx, r.y, SHIMMER.w, r.h, blend8(C.bar, C.dot, 0.25))
      clipRect(c, r, bx + pad, r.y, SHIMMER.inner, r.h, blend8(C.bar, C.dot, 0.5))
    }
  }
  if (k.p > 0) c.text(SKEL_LABEL.x, SKEL_LABEL.y, SKEL_LABEL.label, blend8(C.bg, C.dot, k.p), TITLE_SCALE)
  if (k.phase === 'trigger') c.pointer(b.x + POINTER_ON_BUTTON.dx, b.y + POINTER_ON_BUTTON.dy, k.slot === CLICK_SLOT)
  else if (atRest(k) || showsActor(k)) c.pointer(SKEL_REST.x, SKEL_REST.y)
}

export const COMPONENT: Readonly<Record<string, Scene>> = {
  drawer,
  tabs,
  accordion,
  modal,
  'bottom-sheet': bottomSheet,
  dropdown,
  tooltip,
  toast,
  carousel,
  skeleton,
}
