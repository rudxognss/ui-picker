import { test, expect } from 'claude-code/testing'
import { BAKERY, bottoms, call, MOUNT, SESSION, TURN, TWO, ui } from './kit'

const BUILT = [
  'ui-picker: build',
  '- 상단 내비게이션: Sticky Header',
  '- 상단 영역: Hero Section',
  '- 빵 메뉴: Card Layout (네 선택) · cols 4 · gap 16px',
  '- 메뉴 카드: Hover Effect (변경) · lift 4px · "그림자도 살짝"',
].join('\n')

test('bakery: pick card-layout, set cols 4 and gap 16, lift 4 and a note, Enter builds the exact message', async ($, on) => {
  const k = bottoms(on)
  await $.session.start(SESSION)
  expect(JSON.parse((await $.tool.call(BAKERY) as any).result)).toEqual({ review: true, questions: 1 })
  const ui2 = await $.ui.mount(MOUNT)
  expect(await ui2.find({ text: '빵집 사이트' })).toBeDefined()
  expect(await ui2.find({ text: '질문 1/1' })).toBeDefined()
  expect(await ui2.find({ text: '1: 카드 레이아웃 · 추천' })).toBeDefined()
  await ui2.press({ key: 'pick-0' })
  expect(await ui2.find({ text: '빵집 사이트 · 결정 4' })).toBeDefined()
  expect(await ui2.find({ text: '빵 메뉴 · 카드 레이아웃' })).toBeDefined()
  expect(await ui2.find({ text: /\[네 선택\]  열 3 · 1024px에서 2 · 768px 아래 1 · 간격 24px/ })).toBeDefined()
  await ui2.press({ key: 'row-2' })
  await ui2.select({ key: 'p-2-cols', value: '4' })
  await ui2.select({ key: 'p-2-gap', value: '16' })
  await ui2.press({ key: 'row-3' })
  await ui2.select({ key: 'p-3-lift', value: '4' })
  await ui2.input({ key: 'note-3', text: '그림자도 살짝' })
  expect(await ui2.find({ text: '[모델 판단] [변경]' })).toBeDefined()
  expect(k.submitted).toEqual([])
  await ui2.press({ key: 'build' })
  expect(k.submitted).toEqual([BUILT])
  expect(k.filled).toEqual([])
  expect(k.closed).toEqual([{ id: 'ui-picker', origin: 'plugin' }])
  // building: rows read-only, no Build, the hint says so
  expect(await ui2.find({ text: '이 결정으로 만드는 중… (수정은 이후 반영)' })).toBeDefined()
  expect(await ui2.find({ key: 'build' })).toBeUndefined()
  expect((await ui2.findAll({ type: 'Select' })).length).toBe(0)
  expect((await ui2.findAll({ type: 'Input' })).length).toBe(0)
  expect((await ui2.findAll({ type: 'Button' })).map(b => b.key)).toEqual(['row-0', 'row-1', 'row-2', 'row-3'])
  // the turn ends: done
  await $.turn.start({ text: 'ui-picker: build', turnId: TURN.turnId })
  await $.turn.complete(TURN)
  expect(await ui2.find({ text: '완료 · 1-4: 수정 · Enter: 변경 보내기' })).toBeDefined()
  expect(await ui2.find({ key: 'build' })).toBeUndefined()
})

test('zero questions: Enter on Build sends the model rows as they stand', async ($, on) => {
  const k = bottoms(on)
  await $.session.start(SESSION)
  await $.tool.call(call({ lang: 'en' }, ui('nav', 'sticky-header'), ui('hero', 'hero-section')))
  const ui2 = await $.ui.mount(MOUNT)
  await ui2.press({ key: 'build' })
  expect(k.submitted).toEqual(['ui-picker: build\n- nav: Sticky Header\n- hero: Hero Section'])
  // a second press in building does nothing
  await ui2.press({ key: 'row-0' })
  expect(k.submitted.length).toBe(1)
})

test('done: edits show Send changes; Enter sends the diff; the plan goes back to building and then done', async ($, on) => {
  const k = bottoms(on)
  await $.session.start(SESSION)
  await $.tool.call(TWO)
  const ui2 = await $.ui.mount(MOUNT)
  await ui2.press({ key: 'pick-0' })
  await ui2.press({ key: 'pick-1' })
  await ui2.press({ key: 'build' })
  expect(k.submitted).toEqual(['ui-picker: build\n- settings: Drawer (your pick)\n- features: Card Layout (your pick)'])
  await $.turn.start({ text: 'ui-picker: build', turnId: TURN.turnId })
  await $.turn.complete(TURN)
  expect(await ui2.find({ text: 'Built · 1-2: edit · Enter: send changes' })).toBeDefined()
  expect(await ui2.find({ key: 'build' })).toBeUndefined()
  await ui2.press({ key: 'row-1' })
  expect((await ui2.findAll({ type: 'Select' })).map(s => s.key)).toEqual(['p-1-cols', 'p-1-md', 'p-1-sm', 'p-1-gap'])
  await ui2.select({ key: 'p-1-cols', value: '4' })
  const send = await ui2.find({ key: 'build' })
  expect(send?.props).toMatchObject({ hotkey: '0', variant: 'primary', label: 'Send changes' })
  // a swap from done returns to done
  await ui2.press({ key: 'swap' })
  expect(await ui2.find({ text: 'Swap the pattern for features' })).toBeDefined()
  await ui2.press({ key: 'pick-1' })
  expect(await ui2.find({ text: 'features · Bento Grid' })).toBeDefined()
  expect(await ui2.find({ text: 'Built · 1-2: edit · Enter: send changes' })).toBeDefined()
  await ui2.press({ key: 'reset' })
  expect(await ui2.find({ text: 'features · Card Layout' })).toBeDefined()
  expect(await ui2.find({ key: 'build' })).toBeUndefined() // back to what was sent: nothing to send
  await ui2.select({ key: 'p-1-cols', value: '4' })
  await ui2.input({ key: 'note-1', text: 'bigger thumbnails' })
  await ui2.press({ key: 'build' })
  expect(k.submitted[1]).toBe('ui-picker: change\n- features: Card Layout (your pick) · cols 4 · "bigger thumbnails"')
  expect(k.closed.length).toBe(2)
  expect(await ui2.find({ text: 'Building with these… (edits apply after)' })).toBeDefined()
  await $.turn.start({ text: 'ui-picker: build', turnId: TURN.turnId })
  await $.turn.complete(TURN)
  expect(await ui2.find({ key: 'build' })).toBeUndefined()
  // a new ui_pick is accepted in done and replaces the plan
  expect(JSON.parse((await $.tool.call(call({ lang: 'en' }, ui('faq', 'accordion'))) as any).result)).toEqual({ review: true, questions: 0 })
  expect(await ui2.find({ text: 'faq · Accordion' })).toBeDefined()
  expect(await ui2.find({ key: 'build' })).toBeDefined()
})
