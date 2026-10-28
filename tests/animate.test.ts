import { test, expect } from 'claude-code/testing'
import { hasPng } from '../hooks/previews/images'
import { frame, hasPreview, HOLD_T, PREVIEW_IDS } from '../hooks/previews/index'
import { TERM_IDS } from '../hooks/terms'
import { bottoms, call, MOUNT, RUN, SESSION, ui } from './kit'

/** Three distinct term ids, scenes first (repeats are denied on the wire, so the rest pad from the term table). */
const IDS = [...PREVIEW_IDS, ...TERM_IDS.filter(id => !PREVIEW_IDS.includes(id))].slice(0, 3)
const SCENED = IDS.filter(hasPreview)
const SHEETS = call({ lang: 'en' }, ui('q1', IDS))
const TICK = 100

test('static frames: the mounted previews are as distinct as their ids and none is the bare window', async ($, on) => {
  bottoms(on)
  await $.session.start(SESSION)
  await $.tool.call(SHEETS)
  const ui2 = await $.ui.mount(MOUNT)
  // one box per scened option, every PNG differs
  const images = new Set<string>()
  const boxes = [...(await ui2.findAll({ type: 'Image' })), ...(await ui2.findAll({ type: 'Raster' }))]
  expect(boxes.length).toBe(SCENED.length)
  for (const im of await ui2.findAll({ type: 'Image' })) images.add((im.props as { source: { png: string } }).source.png)
  expect(images.size).toBe(IDS.filter(hasPng).length)
  // Raster cell art gives the same guarantee at the pane's box size (the fallback path is exercised in images.test.ts)
  const { columns, rows } = boxes[0]!.props as { columns: number; rows: number }
  const cells = SCENED.map(id => frame(id, columns, rows, HOLD_T))
  expect(new Set(cells).size).toBe(SCENED.length)
  const bare = frame('window', columns, rows, HOLD_T)
  expect(cells.some(c => c === bare)).toBe(false)
})

test('animation: 15 denied ticks stop the loop; the next asking render re-arms it', async ($, on) => {
  let deny = false
  const k = bottoms(on, { denyBlits: () => deny })
  await $.session.start(SESSION)
  await $.tool.call(SHEETS)
  const ui2 = await $.ui.mount(MOUNT)
  await k.clock.advance(TICK * 3)
  const running = k.blits.length
  expect(running).toBeGreaterThan(0)
  deny = true
  await k.clock.advance(TICK * 16)
  const stopped = k.blits.length
  expect(stopped).toBeGreaterThan(running)
  await k.clock.advance(TICK * 5)
  expect(k.blits.length).toBe(stopped)
  deny = false
  await ui2.redraw()
  await k.clock.advance(TICK * 3)
  expect(k.blits.length).toBeGreaterThan(stopped)
})

test('animation: /ui-picker re-arms a stopped loop', async ($, on) => {
  let deny = false
  const k = bottoms(on, { denyBlits: () => deny })
  await $.session.start(SESSION)
  await $.tool.call(SHEETS)
  await $.ui.mount(MOUNT)
  deny = true
  await k.clock.advance(TICK * 16)
  const stopped = k.blits.length
  await k.clock.advance(TICK * 5)
  expect(k.blits.length).toBe(stopped)
  deny = false
  expect((await $.command.run(RUN)).text).toBe('pending question opened.')
  await k.clock.advance(TICK * 3)
  expect(k.blits.length).toBeGreaterThan(stopped)
})

test('animation: review thumbs feed the same loop under rev- keys; the picker keys stop', async ($, on) => {
  const k = bottoms(on)
  await $.session.start(SESSION)
  await $.tool.call(SHEETS)
  const ui2 = await $.ui.mount(MOUNT)
  await k.clock.advance(TICK * 3)
  expect(k.blits.length).toBeGreaterThan(0)
  await ui2.press({ key: 'pick-0' })
  expect(await ui2.find({ key: 'build' })).toBeDefined()
  await ui2.redraw()
  const settled = k.blits.length
  await k.clock.advance(TICK * 5)
  const later = k.blits.slice(settled)
  expect(later.every(b => b === 'rev-0')).toBe(true)
  expect(later.length > 0).toBe(hasPreview(IDS[0]!))
})
