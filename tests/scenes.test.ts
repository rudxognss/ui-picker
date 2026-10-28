import { test, expect } from 'claude-code/testing'
import { keyframe, PHASES, SLOTS, slotOf } from '../hooks/previews/canvas'
import { QUADRANTS } from '../hooks/previews/cells'
import { FONT, GLYPH_H } from '../hooks/previews/font5x7'
import { frame, hasPreview, HOLD_T, PREVIEW_IDS } from '../hooks/previews/index'
import { renderSlot } from '../hooks/previews/pixel'
import { SCENES } from '../hooks/previews/scenes/index'

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const decode = (s: string): Uint8Array => {
  const clean = s.replace(/=+$/, '')
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4))
  let acc = 0, bits = 0, o = 0
  for (const ch of clean) {
    acc = (acc << 6) | B64.indexOf(ch)
    bits += 6
    if (bits >= 8) {
      bits -= 8
      out[o++] = (acc >> bits) & 255
    }
  }
  return out
}
const u32 = (b: Uint8Array, o: number): number => (b[o]! | (b[o + 1]! << 8) | (b[o + 2]! << 16) | (b[o + 3]! << 24)) >>> 0
const codePoints = (cells: string): number[] => {
  const b = decode(cells)
  const out: number[] = []
  for (let i = 0; i < b.length; i += 12) out.push(u32(b, i))
  return out
}
const BLOCKS = new Set(QUADRANTS.map(g => g.codePointAt(0)!))
const HOLD_SLOT = PHASES.hold[0]

test('timing: 40 slots, phases tile the loop, p is 0/ease-out/1/ease-in/0 and enter mirrors exit', async () => {
  expect(SLOTS).toBe(40)
  expect(slotOf(0.02)).toBe(0)
  expect(slotOf(HOLD_T)).toBe(20)
  expect(slotOf(1.5)).toBe(20)
  expect(slotOf(-0.5)).toBe(20)
  expect(slotOf(0.999999)).toBe(39)
  const covered = new Set<number>()
  for (const [a, b] of Object.values(PHASES)) for (let s = a; s < b; s++) covered.add(s)
  expect(covered.size).toBe(SLOTS)
  for (let s = 0; s < SLOTS; s++) {
    const k = keyframe(s)
    expect(k.slot).toBe(s)
    expect(k.t).toBe(s / SLOTS)
    if (k.phase === 'idle' || k.phase === 'trigger' || k.phase === 'rest') expect(k.p).toBe(0)
    if (k.phase === 'hold') expect(k.p).toBe(1)
    if (k.phase === 'enter' || k.phase === 'exit') {
      expect(k.p).toBeGreaterThan(0)
      expect(k.p).toBeLessThanOrEqual(1)
    }
  }
  const [ea, eb] = PHASES.enter
  const [xa] = PHASES.exit
  for (let i = 0; i < eb - ea; i++) expect(keyframe(ea + i).p).toBe(keyframe(xa + (eb - ea) - 1 - i).p)
  for (let s = ea; s < eb - 1; s++) expect(keyframe(s).p).toBeLessThan(keyframe(s + 1).p)
  expect(keyframe(HOLD_SLOT).phase).toBe('hold')
  expect(keyframe(SLOTS + 3).slot).toBe(3)
})

test('font: 95 glyphs of 7 row bytes, 5 bits wide', async () => {
  expect(FONT.length).toBe(95 * GLYPH_H)
  for (const b of FONT) expect(b).toBeLessThan(32)
})

test('registry: every scene is a function; window is a Raster-only pseudo id', async () => {
  for (const id of Object.keys(SCENES)) expect(typeof SCENES[id]).toBe('function')
  expect(hasPreview('window')).toBe(true)
  expect(hasPreview('drawer')).toBe(true)
  expect(hasPreview('nope')).toBe(false)
  expect(PREVIEW_IDS.includes('window')).toBe(false)
  expect(PREVIEW_IDS.length).toBe(Object.keys(SCENES).length - 1)
  expect(() => frame('nope', 20, 8, 0)).toThrow('unknown preview')
})

test('scenes: open differs from closed at 20x8 for every id', async () => {
  for (const id of PREVIEW_IDS) expect(frame(id, 20, 8, 0.02) === frame(id, 20, 8, HOLD_T)).toBe(false)
})

test('scenes: hold states pairwise distinct, as 20x8 cells and as 480x320 pixels', async () => {
  const cells = PREVIEW_IDS.map(id => frame(id, 20, 8, HOLD_T))
  expect(new Set(cells).size).toBe(PREVIEW_IDS.length)
  const hashes = PREVIEW_IDS.map(id => renderSlot(SCENES[id]!, 480, 320, HOLD_SLOT).hash())
  expect(new Set(hashes).size).toBe(PREVIEW_IDS.length)
})

// One test per size: all three together sit at the runner's 5 s per-test budget.
for (const [W, H] of [[12, 4], [16, 6], [24, 8]] as const)
  test(`scenes: every cell is a quadrant block or printable ASCII at ${W}x${H}, all 40 slots`, async () => {
    for (const id of Object.keys(SCENES))
      for (let s = 0; s < SLOTS; s++) {
        const cells = frame(id, W, H, s / SLOTS)
        expect(cells.length).toBe(W * H * 16)
        const bad = codePoints(cells).filter(cp => !(BLOCKS.has(cp) || (cp >= 32 && cp <= 126)))
        expect(bad).toEqual([])
      }
  })

test('scenes: 480x320 frames stay within 256 colors at every slot', async () => {
  for (const id of PREVIEW_IDS) for (let s = 0; s < SLOTS; s++) expect(renderSlot(SCENES[id]!, 480, 320, s).palette.length).toBeLessThanOrEqual(256)
})

test('cells: a wide box overlays the drawer labels as glyph cells; a narrow one keeps pure block art', async () => {
  const wide = String.fromCodePoint(...codePoints(frame('drawer', 24, 8, HOLD_T)))
  expect(wide).toContain('Drawer')
  expect(wide.includes('nu')).toBe(false) // the bar's Menu label is covered by the open panel
  const narrow = codePoints(frame('drawer', 16, 6, HOLD_T))
  for (const cp of narrow) expect(BLOCKS.has(cp)).toBe(true)
  const closed = String.fromCodePoint(...codePoints(frame('drawer', 24, 8, 0.02)))
  expect(closed).toContain('Menu')
})
