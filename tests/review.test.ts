import type { On } from 'claude-code'
import type { Engine } from 'claude-code/testing'
import { test, expect } from 'claude-code/testing'
import { hasPng } from '../hooks/previews/images'
import { hasPreview } from '../hooks/previews/index'
import { bottoms, call, MOUNT, PANE, SESSION, TWO, ui } from './kit'

const TICK = 100
const REVIEWS = { id: 'ui-picker', focus: true }

/** TWO picked as 2 (Modal) then 1 (Bento Grid): the review of two user picks. */
async function reviewed($: Engine, on: On) {
  const k = bottoms(on)
  await $.session.start(SESSION)
  await $.tool.call(TWO)
  const ui = await $.ui.mount(MOUNT)
  await ui.press({ key: 'pick-1' })
  await ui.press({ key: 'pick-0' })
  return { k, ui }
}

test('review: header, hint, rows with hotkeys and tags, chips, thumbs by preview, primary Build with autoFocus', async ($, on) => {
  const { k, ui } = await reviewed($, on)
  expect(await ui.find({ text: 'decisions 2' })).toBeDefined()
  expect(await ui.find({ text: 'Enter: build · 1-2: edit · Esc: back to prompt' })).toBeDefined()
  expect((await ui.find({ key: 'row-0' }))?.props).toMatchObject({ plain: true, hotkey: '1', label: 'settings · Modal' })
  expect((await ui.find({ key: 'row-1' }))?.props).toMatchObject({ plain: true, hotkey: '2', label: 'features · Bento Grid' })
  expect((await ui.findAll({ type: 'Button' })).map(b => b.key)).toEqual(['row-0', 'row-1', 'build'])
  expect(await ui.find({ text: /\[your pick\]  width 560px · backdrop dim · full below 640px/ })).toBeDefined()
  expect(await ui.find({ text: /\[your pick\]  columns 4 · feature 2x2 · gap 16px/ })).toBeDefined()
  const build = await ui.find({ key: 'build' })
  expect(build?.props).toMatchObject({ hotkey: '0', variant: 'primary', autoFocus: true, label: 'Build' })
  expect((await ui.findAll({ type: 'Select' })).length).toBe(0)
  expect((await ui.findAll({ type: 'Input' })).length).toBe(0)
  // thumbs: 16 columns collapsed, Image where a PNG exists, Raster where only a scene does
  const thumbs = [...(await ui.findAll({ type: 'Image' })), ...(await ui.findAll({ type: 'Raster' }))]
  expect(thumbs.length).toBe(['modal', 'bento-grid'].filter(hasPreview).length)
  for (const th of thumbs) expect((th.props as { columns: number }).columns).toBe(16)
  expect((await ui.findAll({ type: 'Image' })).length).toBe(['modal', 'bento-grid'].filter(hasPng).length)
  await k.clock.advance(TICK * 3)
  expect(k.blits.filter(b => b.startsWith('rev-')).length > 0).toBe(thumbs.length > 0)
  expect(k.submitted).toEqual([])
})

test('row: expands with Selects per param, a note Input, swap and reset; focus goes to the first param; Build loses autoFocus', async ($, on) => {
  const { k, ui } = await reviewed($, on)
  await ui.press({ key: 'row-0' })
  const selects = await ui.findAll({ type: 'Select' })
  expect(selects.map(s => s.key)).toEqual(['p-0-width', 'p-0-backdrop', 'p-0-full_below'])
  expect(selects[0]!.props).toMatchObject({ label: 'width', value: '560' })
  expect((selects[0]!.props as { options: { value: string; label: string }[] }).options).toEqual([
    { value: '400', label: '400px' },
    { value: '440', label: '440px' },
    { value: '480', label: '480px' },
    { value: '520', label: '520px' },
    { value: '560', label: '560px' },
    { value: '600', label: '600px' },
    { value: '640', label: '640px' },
    { value: '680', label: '680px' },
    { value: '720', label: '720px' },
  ])
  expect((selects[2]!.props as { options: { value: string }[] }).options.map(o => o.value)).toEqual(['480', '640', 'none'])
  const note = await ui.find({ key: 'note-0' })
  expect(note?.type).toBe('Input')
  expect(note?.props).toMatchObject({ label: 'Note', placeholder: 'An instruction for this row', value: '', submitLabel: 'Save' })
  expect((await ui.find({ key: 'swap' }))?.props).toMatchObject({ hotkey: 'x', plain: true, label: 'swap pattern' })
  expect((await ui.find({ key: 'reset' }))?.props).toMatchObject({ hotkey: 'r', plain: true, label: 'reset' })
  expect((await ui.find({ key: 'build' }))?.props.autoFocus).toBeUndefined()
  // the open row's thumb is wider
  const big = (await ui.find({ key: 'rev-0', type: 'Image' })) ?? (await ui.find({ key: 'rev-0', type: 'Raster' }))
  if (hasPreview('modal')) expect((big!.props as { columns: number }).columns).toBe(24)
  // the same digit collapses it
  await ui.press({ key: 'row-0' })
  expect((await ui.findAll({ type: 'Select' })).length).toBe(0)
  expect((await ui.find({ key: 'build' }))?.props.autoFocus).toBe(true)
})

test('edits: a Select sets the param and tags the row changed; a note saves trimmed; reset restores the row', async ($, on) => {
  const { ui } = await reviewed($, on)
  await ui.press({ key: 'row-0' })
  await ui.select({ key: 'p-0-width', value: '400' })
  expect((await ui.find({ key: 'p-0-width' }))?.props.value).toBe('400')
  expect(await ui.find({ text: '[your pick] [changed]' })).toBeDefined()
  await ui.select({ key: 'p-0-full_below', value: 'none' })
  expect((await ui.find({ key: 'p-0-full_below' }))?.props.value).toBe('none')
  await ui.input({ key: 'note-0', text: '  keep it narrow  ' })
  expect((await ui.find({ key: 'note-0' }))?.props.value).toBe('keep it narrow')
  await ui.press({ key: 'reset' })
  expect((await ui.find({ key: 'p-0-width' }))?.props.value).toBe('560')
  expect((await ui.find({ key: 'p-0-full_below' }))?.props.value).toBe('640')
  expect((await ui.find({ key: 'note-0' }))?.props.value).toBe('')
  expect(await ui.find({ text: /\[changed\]/ })).toBeUndefined()
  // an out-of-range value falls back to the default
  await ui.select({ key: 'p-0-width', value: '9999' })
  expect((await ui.find({ key: 'p-0-width' }))?.props.value).toBe('560')
})

test('swap: a synthetic question over [term, ...alt] with the current one labelled; a pick swaps the row, x keeps it', async ($, on) => {
  const { k, ui } = await reviewed($, on)
  await ui.press({ key: 'row-0' })
  await ui.press({ key: 'swap' })
  expect(await ui.find({ text: 'Swap the pattern for settings' })).toBeDefined()
  expect(await ui.find({ text: '1: Modal (current)' })).toBeDefined()
  expect(await ui.find({ text: '2: Drawer' })).toBeDefined()
  expect(await ui.find({ text: '3: Bottom Sheet' })).toBeDefined()
  expect(await ui.find({ text: 'Question 1 of 2' })).toBeUndefined()
  expect((await ui.find({ key: 'swap-cancel' }))?.props).toMatchObject({ hotkey: 'x', plain: true, label: 'keep' })
  // the current option is shown large with its caption
  expect(await ui.find({ text: 'A centered dialog grows from the middle over a dimmed page; Cancel or Esc closes it' })).toBeDefined()
  await ui.press({ key: 'swap-cancel' })
  expect(await ui.find({ text: 'settings · Modal' })).toBeDefined()
  expect((await ui.findAll({ type: 'Select' })).length).toBe(3) // the row stays open
  await ui.press({ key: 'swap' })
  await ui.press({ key: 'pick-1' })
  expect(await ui.find({ text: 'settings · Drawer' })).toBeDefined()
  expect(await ui.find({ text: '[your pick] [changed]' })).toBeDefined()
  expect((await ui.findAll({ type: 'Select' })).map(s => s.key)).toEqual(['p-0-side', 'p-0-width', 'p-0-mobile'])
  // a second ui_pick is still denied while swapping or reviewing
  expect((await $.tool.call(TWO) as any).deny).toBe('ui-picker: the plan is under review in the pane. Do not build; wait for the "ui-picker: build" message.')
  expect(k.submitted).toEqual([])
  // review opens were requested with the keyboard, never closeOnEscape
  expect(k.opens.slice(1).every(o => o.focus === true && o.closeOnEscape === undefined)).toBe(true)
  expect(k.opens[1]).toEqual(REVIEWS)
})

test('zero questions stop at review with the model rows; a narrow pane stacks the open row', async ($, on) => {
  const k = bottoms(on)
  await $.session.start(SESSION)
  const r = await $.tool.call(call({ lang: 'en', params: { nav: { height: 72 } } }, ui('nav', 'sticky-header'), ui('hero', 'hero-section')))
  expect(JSON.parse((r as any).result)).toEqual({ review: true, questions: 0 })
  expect(k.opens).toEqual([REVIEWS])
  const ui2 = await $.ui.mount({ ...MOUNT, props: { ...PANE, bodyColumns: 50 } })
  expect(await ui2.find({ text: 'decisions 2' })).toBeDefined()
  expect(await ui2.find({ text: /\[model\]  height 72px · shadow on · mobile logo\+menu/ })).toBeDefined()
  expect(await ui2.find({ text: /\[changed\]/ })).toBeUndefined()
  expect((await ui2.find({ key: 'build' }))?.props.autoFocus).toBe(true)
  await ui2.press({ key: 'row-0' })
  expect((await ui2.find({ key: 'p-0-height' }))?.props.value).toBe('72')
  expect(k.submitted).toEqual([])
})

test('ko review strings', async ($, on) => {
  bottoms(on)
  await $.session.start(SESSION)
  await $.tool.call(call({ lang: 'ko', title: '빵집 사이트' }, ui('상단 영역', 'hero-section')))
  const ui2 = await $.ui.mount(MOUNT)
  expect(await ui2.find({ text: '빵집 사이트 · 결정 1' })).toBeDefined()
  expect(await ui2.find({ text: 'Enter: 빌드 · 1-1: 수정 · Esc: 입력창으로' })).toBeDefined()
  expect(await ui2.find({ text: '상단 영역 · 히어로 섹션' })).toBeDefined()
  expect(await ui2.find({ text: /\[모델 판단\]  CTA 수 1 · 미디어 right · 쌓임 기준 768px/ })).toBeDefined()
  expect((await ui2.find({ key: 'build' }))?.props.label).toBe('빌드')
  await ui2.press({ key: 'row-0' })
  expect((await ui2.find({ key: 'p-0-ctas' }))?.props.label).toBe('CTA 수')
  expect((await ui2.find({ key: 'note-0' }))?.props).toMatchObject({ label: '메모', submitLabel: '저장' })
  expect((await ui2.find({ key: 'swap' }))?.props.label).toBe('패턴 바꾸기')
  expect((await ui2.find({ key: 'reset' }))?.props.label).toBe('기본값')
  await ui2.press({ key: 'swap' })
  expect(await ui2.find({ text: '상단 영역의 패턴 바꾸기' })).toBeDefined()
  expect(await ui2.find({ text: '1: 히어로 섹션 (지금)' })).toBeDefined()
  expect((await ui2.find({ key: 'swap-cancel' }))?.props.label).toBe('그대로')
})
