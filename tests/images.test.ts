import { test, expect } from 'claude-code/testing'
import { hasPng, imageRows, PNG_H, PNG_INDEX, PNG_W, pngFrame, SLOTS } from '../hooks/previews/images'
import { hasPreview, PREVIEW_IDS } from '../hooks/previews/index'
import { TERM_IDS } from '../hooks/terms'
import { bottoms, call, MOUNT, SESSION, ui } from './kit'

/** Three distinct term ids, scenes first (repeats are denied on the wire, so the rest pad from the term table). */
const IDS = [...PREVIEW_IDS, ...TERM_IDS.filter(id => !PREVIEW_IDS.includes(id))].slice(0, 3)
const REAL = call({ lang: 'en' }, ui('q1', IDS))
const N_PNG = IDS.filter(hasPng).length
const N_SCENE = IDS.filter(hasPreview).length
const TICK = 100

test('png frames: 480x320, 40 slots; every indexed id tells open from closed', async () => {
  expect(SLOTS).toBe(40)
  expect(PNG_W).toBe(480)
  expect(PNG_H).toBe(320)
  for (const id of Object.keys(PNG_INDEX)) {
    expect(hasPng(id)).toBe(true)
    expect(pngFrame(id, 0.5).startsWith('iVBORw0KGgo')).toBe(true)
    expect(pngFrame(id, 0.5) === pngFrame(id, 0.02)).toBe(false) // open vs closed phase
  }
  expect(hasPng('window')).toBe(false)
  expect(hasPng('nope')).toBe(false)
})

test('image rows keep the 3:2 picture within bounds', async () => {
  expect(imageRows(22, 4, 12)).toBe(7)
  expect(imageRows(30, 4, 5)).toBe(5)
  expect(imageRows(9, 4, 12)).toBe(4)
})

test('picker: ids with a PNG render Images by default and the loop blits PNG sources', async ($, on) => {
  const k = bottoms(on)
  await $.session.start(SESSION)
  await $.tool.call(REAL)
  const ui2 = await $.ui.mount(MOUNT)
  // every option is on screen
  const images = await ui2.findAll({ type: 'Image' })
  expect(images.length).toBe(IDS.filter(hasPng).length)
  expect((await ui2.findAll({ type: 'Raster' })).length).toBe(IDS.filter(id => hasPreview(id) && !hasPng(id)).length)
  for (const i of images) expect((i.props as { columns: number; rows: number }).rows).toBeGreaterThanOrEqual(6)
  await k.clock.advance(TICK * 3)
  expect(k.blits.length > 0).toBe(N_SCENE > 0)
})

test('picker: a terminal that draws the alt instead of the Image falls back to Raster for the session, through review', async ($, on) => {
  const k = bottoms(on, { denyBlits: () => true, blitDeny: 'an Image drawing its alt there' })
  await $.session.start(SESSION)
  await $.tool.call(REAL)
  const ui2 = await $.ui.mount(MOUNT)
  expect((await ui2.findAll({ type: 'Image' })).length).toBe(IDS.filter(hasPng).length)
  await k.clock.advance(TICK * 2)
  await ui2.redraw()
  expect((await ui2.findAll({ type: 'Image' })).length).toBe(0)
  expect((await ui2.findAll({ type: 'Raster' })).length).toBe(IDS.filter(hasPreview).length)
  // the fallback sticks through review
  await ui2.press({ key: 'pick-0' })
  await ui2.redraw()
  expect((await ui2.findAll({ type: 'Image' })).length).toBe(0)
  expect((await ui2.findAll({ type: 'Raster' })).length).toBe(hasPreview(IDS[0]!) ? 1 : 0)
})

test('review: rows whose term has a preview draw thumbnails and animate; the others draw none', async ($, on) => {
  const k = bottoms(on)
  await $.session.start(SESSION)
  const r = await $.tool.call(call({ lang: 'en' }, ui('Layout', IDS[0]!), ui('Settings', IDS[1]!), ui('Other', IDS[2]!)))
  expect(JSON.parse((r as any).result)).toEqual({ review: true, questions: 0 })
  const ui2 = await $.ui.mount(MOUNT)
  expect((await ui2.findAll({ type: 'Image' })).length).toBe(N_PNG)
  expect((await ui2.findAll({ type: 'Raster' })).length).toBe(N_SCENE - N_PNG)
  for (const img of await ui2.findAll({ type: 'Image' })) expect((img.props as { columns: number; rows: number }).columns).toBe(16)
  expect(await ui2.find({ key: 'row-2' })).toBeDefined()
  await k.clock.advance(TICK * 3)
  expect(k.blits.filter(b => b.startsWith('rev-')).length > 0).toBe(N_SCENE > 0)
})
