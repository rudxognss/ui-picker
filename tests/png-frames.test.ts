import { test, expect } from 'claude-code/testing'
import { SLOTS as CANVAS_SLOTS } from '../hooks/previews/canvas'
import { hasPng, PNG_H, PNG_INDEX, PNG_UNIQUE, PNG_W, pngFrame, SLOTS } from '../hooks/previews/images'
import { sceneHash } from '../hooks/previews/pixel'
import { PREVIEW_IDS } from '../hooks/previews/index'
import { SCENE_HASH } from '../hooks/previews/png-frames'
import { SCENES } from '../hooks/previews/scenes/index'

// Every scene must be indexed: an unregenerated png-frames.ts fails here, not silently at the pane.
const IDS = [...PREVIEW_IDS]
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const decode = (s: string): number[] => {
  const out: number[] = []
  let acc = 0, bits = 0
  for (const ch of s.replace(/=+$/, '')) {
    acc = (acc << 6) | B64.indexOf(ch)
    bits += 6
    if (bits >= 8) {
      bits -= 8
      out.push((acc >> bits) & 255)
    }
  }
  return out
}
const be32 = (b: number[], o: number): number => ((b[o]! << 24) | (b[o + 1]! << 16) | (b[o + 2]! << 8) | b[o + 3]!) >>> 0

test('png frames: 480x320, 40 slots, every indexed id has 40 in-range indices and an open state unlike its closed one', async () => {
  expect(PNG_W).toBe(480)
  expect(PNG_H).toBe(320)
  expect(SLOTS).toBe(40)
  expect(SLOTS).toBe(CANVAS_SLOTS)
  expect(IDS.length).toBeGreaterThan(0)
  for (const id of IDS) {
    expect(hasPng(id)).toBe(true)
    expect(typeof SCENES[id]).toBe('function')
    const slots = PNG_INDEX[id]!
    expect(slots.length).toBe(SLOTS)
    for (const i of slots) expect(Number.isInteger(i) && i >= 0 && i < PNG_UNIQUE.length).toBe(true)
    expect(slots[0] === slots[20]).toBe(false)
    expect(pngFrame(id, 0.5) === pngFrame(id, 0.02)).toBe(false)
  }
  expect(hasPng('window')).toBe(false)
  expect(hasPng('nope')).toBe(false)
  expect(() => pngFrame('nope', 0)).toThrow('unknown preview')
})

test('png frames: every unique frame is an indexed 480x320 PNG, bit depth 4 or 8, within budget', async () => {
  expect(PNG_UNIQUE.length).toBeGreaterThan(0)
  for (const f of PNG_UNIQUE) {
    expect(f.startsWith('iVBORw0KGgo')).toBe(true)
    expect(f.length).toBeLessThanOrEqual(4000)
    const b = decode(f.slice(0, 48))
    expect(be32(b, 16)).toBe(480)
    expect(be32(b, 20)).toBe(320)
    expect(b[24] === 4 || b[24] === 8).toBe(true)
    expect(b[25]).toBe(3)
  }
  for (const id of IDS) {
    const bytes = [...new Set(PNG_INDEX[id]!)].reduce((n, i) => n + PNG_UNIQUE[i]!.length, 0)
    expect(bytes).toBeLessThanOrEqual(30_000)
  }
  expect(PNG_UNIQUE.join('').length).toBeLessThan(600_000)
})

test('png frames: phase wraps and picks a slot', async () => {
  const id = IDS[0]!
  expect(pngFrame(id, 1.5)).toBe(pngFrame(id, 0.5))
  expect(pngFrame(id, -0.5)).toBe(pngFrame(id, 0.5))
  expect(pngFrame(id, 0.5)).toBe(PNG_UNIQUE[PNG_INDEX[id]![20]!])
})

test('png frames: PNG_INDEX and SCENE_HASH cover exactly the preview ids', async () => {
  expect(Object.keys(PNG_INDEX).sort()).toEqual([...IDS].sort())
  expect(Object.keys(SCENE_HASH).sort()).toEqual([...IDS].sort())
})
// One test per id: a full 25-id render exceeds the runner's 5 s per-test budget.
for (const id of IDS)
  test(`png frames: SCENE_HASH[${id}] matches the scene as it is now (else run bun scripts/render-previews.ts)`, async () => {
    expect(sceneHash(SCENES[id]!, PNG_W, PNG_H)).toBe(SCENE_HASH[id])
  })
