import type { Plugin } from 'claude-code/testing'
import { test, expect } from 'claude-code/testing'
import { imageRows } from '../hooks/previews/images'
import { hasPreview } from '../hooks/previews/index'
import { IDLE_LINE, notPlaced } from '../hooks/trigger'
import { bottoms, call, MOUNT, PANE, RUN, SESSION, TWO, ui } from './kit'

const TICK = 100
/** An ask open takes the keyboard and dialog manners; a review open the keyboard alone; a show open neither. */
const ASKS = { id: 'ui-picker', focus: true, closeOnEscape: true }
const REVIEWS = { id: 'ui-picker', focus: true }
const SHOWS = { id: 'ui-picker' }
const HINT = 'Esc: apply recommended to remaining'
const DRAWER_WHEN = 'Secondary content or settings that must not leave the page.'
const DRAWER_CAPTION = 'A panel slides in from the right over a dimmed page; Esc closes it'
const MODAL_CAPTION = 'A centered dialog grows from the middle over a dimmed page; Cancel or Esc closes it'

const big = async (ui: any, j = 0) => (await ui.find({ key: 'preview-' + j, type: 'Image' })) ?? (await ui.find({ key: 'preview-' + j, type: 'Raster' }))

test('ui_pick renders question 1 of 2: every option large with caption, when and chips; one Button per option', async ($, on) => {
  const k = bottoms(on)
  await $.session.start(SESSION)
  const r = await $.tool.call(TWO)
  expect(JSON.parse((r as any).result)).toEqual({ review: true, questions: 2 })
  const ui = await $.ui.mount(MOUNT)
  expect(await ui.find({ text: 'settings' })).toBeDefined()
  expect(await ui.find({ text: 'Question 1 of 2 · Pick a pattern for this area' })).toBeDefined()
  expect(await ui.find({ text: '1: Drawer · recommended' })).toBeDefined()
  expect(await ui.find({ text: '2: Modal' })).toBeDefined()
  expect(await ui.find({ text: '3: Bottom Sheet' })).toBeDefined()
  expect((await ui.findAll({ type: 'Button' })).map(b => b.key)).toEqual(['pick-0', 'pick-1', 'pick-2'])
  // every option: caption, when, chips under its preview
  expect(await ui.find({ text: DRAWER_CAPTION })).toBeDefined()
  expect(await ui.find({ text: MODAL_CAPTION })).toBeDefined()
  expect(await ui.find({ text: 'On a phone, a sheet with a handle slides up from the bottom; a tap outside closes it' })).toBeDefined()
  expect(await ui.find({ text: 'side right · width 400px · mobile full' })).toBeDefined()
  expect((await ui.findAll({ type: 'Text', text: DRAWER_WHEN })).length).toBe(1)
  expect(await ui.find({ text: 'One task must be finished or dismissed before returning.' })).toBeDefined()
  // every preview as wide as the body: W = min(60 - 2, 160) = 58
  const ids = ['drawer', 'modal', 'bottom-sheet']
  for (const [j, id] of ids.entries()) {
    const p = await big(ui, j)
    if (!hasPreview(id)) continue
    expect(p).toBeDefined()
    expect((p!.props as { columns: number }).columns).toBe(58)
    expect((p!.props as { rows: number }).rows).toBe(imageRows(58, 6, 48))
  }
  expect([...(await ui.findAll({ type: 'Image' })), ...(await ui.findAll({ type: 'Raster' }))].length).toBe(ids.filter(hasPreview).length)
  expect(await ui.find({ text: HINT })).toBeDefined()
  expect(k.submitted.length).toBe(0)
  expect(k.opens).toEqual([ASKS])
  // every preview feeds the loop
  await k.clock.advance(TICK * 3)
  for (const [j, id] of ids.entries()) if (hasPreview(id)) expect(k.blits.some(b => b === 'preview-' + j)).toBe(true)
})

test('a digit picks its option; the next question shows all of its options', async ($, on) => {
  const k = bottoms(on)
  await $.session.start(SESSION)
  await $.tool.call(TWO)
  const ui = await $.ui.mount(MOUNT)
  await ui.press({ key: 'pick-2' })
  expect(await ui.find({ text: 'Question 2 of 2 · Pick a pattern for this area' })).toBeDefined()
  expect(await ui.find({ text: '1: Bento Grid · recommended' })).toBeDefined()
  expect((await ui.findAll({ type: 'Button' })).map(b => b.key)).toEqual(['pick-0', 'pick-1'])
  await ui.press({ key: 'pick-1' })
  expect(k.submitted).toEqual([])
  expect(k.opens).toEqual([ASKS, REVIEWS])
  expect(await ui.find({ text: 'decisions 2' })).toBeDefined()
  expect(await ui.find({ text: 'settings · Bottom Sheet' })).toBeDefined()
  expect(await ui.find({ text: 'features · Card Layout' })).toBeDefined()
  expect((await ui.findAll({ type: 'Text', text: /\[your pick\]/ })).length).toBe(2)
  expect(await ui.find({ key: 'build' })).toBeDefined()
})

test('ui_pick denies with remedy when the pane is not placed, with and without questions', async ($, on) => {
  bottoms(on, { placed: false, reason: 'below 144 columns (120 now)' })
  await $.session.start(SESSION)
  expect((await $.tool.call(TWO) as any).deny).toBe(notPlaced('below 144 columns (120 now)'))
  expect((await $.tool.call(call({ lang: 'en' }, ui('nav', 'sticky-header'))) as any).deny).toBe(notPlaced('below 144 columns (120 now)'))
})

test('unknown ids are denied at the tool boundary', async ($, on) => {
  bottoms(on)
  await $.session.start(SESSION)
  expect((await $.tool.call(call({ lang: 'en' }, ui('q1', ['nope', 'drawer']))) as any).deny).toBe('ui.q1: unknown id "nope"')
  expect((await $.tool.call(call({}, ui('a', ['drawer', 'modal']), ui('b', ['tabs', 'accordion']), ui('c', ['toast', 'tooltip']), ui('d', ['stagger', 'parallax']))) as any).deny).toBe(
    'ui: more than 3 questions',
  )
})

test('preview: an Image where a PNG exists with its cells in sync; a Raster matches its box', async ($, on) => {
  bottoms(on)
  await $.session.start(SESSION)
  await $.tool.call(TWO)
  const ui = await $.ui.mount(MOUNT)
  for (const i of await ui.findAll({ type: 'Image' })) {
    const { columns, rows, source } = i.props as { columns: number; rows: number; source: { png: string } }
    expect(columns).toBeGreaterThanOrEqual(16)
    expect(rows).toBeGreaterThanOrEqual(6)
    expect(source.png.startsWith('iVBORw0KGgo')).toBe(true)
  }
  for (const r of await ui.findAll({ type: 'Raster' })) {
    const { columns, rows, cells } = r.props as { columns: number; rows: number; cells: string }
    expect(cells.length).toBe(columns * rows * 16)
  }
})

test('a narrow, short pane keeps the preview at the 16-column floor', async ($, on) => {
  bottoms(on)
  await $.session.start(SESSION)
  await $.tool.call(TWO)
  const ui = await $.ui.mount({ ...MOUNT, props: { ...PANE, bodyColumns: 18, scroll: { offset: 0, bodyRows: 14 } } })
  const p = await big(ui)
  if (hasPreview('drawer')) expect((p!.props as { columns: number }).columns).toBe(16)
})

const CLOSER: Plugin = {
  name: 'closer',
  register(on) {
    on('ui.press', { plugin: 'ui-picker', element: 'pick-2' }, async $ => {
      await $.ui.close({ id: 'ui-picker' })
      return { element: 'pick-2' }
    })
  },
}

test('a plugin-origin close while asking passes through without moving the plan', { plugins: [CLOSER] }, async ($, on) => {
  const k = bottoms(on)
  await $.session.start(SESSION)
  await $.tool.call(TWO)
  const ui = await $.ui.mount(MOUNT)
  await ui.press({ key: 'pick-2' })
  expect(k.closed).toEqual([{ id: 'ui-picker', origin: 'plugin' }])
  expect(k.submitted).toEqual([])
  expect(await ui.find({ text: 'Question 1 of 2 · Pick a pattern for this area' })).toBeDefined()
  expect((await ui.findAll({ type: 'Button' })).length).toBe(3)
})

test('ko picker strings', async ($, on) => {
  bottoms(on)
  await $.session.start(SESSION)
  await $.tool.call({ ...TWO, lang: 'ko' })
  const ui = await $.ui.mount(MOUNT)
  expect(await ui.find({ text: '질문 1/2 · 이 영역의 패턴을 고르세요' })).toBeDefined()
  expect(await ui.find({ text: '1: 드로어 · 추천' })).toBeDefined()
  expect(await ui.find({ text: '어두워진 페이지 위로 패널이 오른쪽에서 밀려 들어옴; Esc로 닫힘' })).toBeDefined()
  expect(await ui.find({ text: '방향 right · 너비 400px · 모바일 full' })).toBeDefined()
  expect(await ui.find({ text: 'Esc: 남은 질문 추천 적용' })).toBeDefined()
})

test('/ui-picker opens by mode and reports what the pane holds', async ($, on) => {
  const k = bottoms(on)
  await $.session.start(SESSION)
  expect((await $.command.run(RUN)).text).toBe(IDLE_LINE)
  expect(k.opens).toEqual([SHOWS])
  await $.tool.call(TWO)
  expect((await $.command.run(RUN)).text).toBe('ui-picker: pending question opened.')
  expect(k.opens).toEqual([SHOWS, ASKS, ASKS])
  const ui = await $.ui.mount(MOUNT)
  await ui.press({ key: 'pick-0' })
  await ui.press({ key: 'pick-0' })
  expect((await $.command.run(RUN)).text).toBe('ui-picker: plan opened for review.')
  expect(k.opens).toEqual([SHOWS, ASKS, ASKS, REVIEWS, REVIEWS])
  await ui.press({ key: 'build' })
  expect((await $.command.run(RUN)).text).toBe('ui-picker: plan opened.')
  expect(k.opens).toEqual([SHOWS, ASKS, ASKS, REVIEWS, REVIEWS, SHOWS])
})
