import { test, expect } from 'claude-code/testing'
import { PENDING_TAIL, UI_CONTEXT } from '../hooks/trigger'
import { BAKERY, bottoms, call, composer, MOUNT, SESSION, TWO, ui } from './kit'

const HEAD = 'ui-picker: a plan is pending in the pane; the person has not confirmed it:'
const KO_HEAD = 'ui-picker: 패널에 확인 대기 중인 계획이 있습니다 (아직 확정 아님):'

test('a typed prompt while asking travels with the pending plan; nothing is confirmed, the pane stays, the question stays', async ($, on) => {
  const k = bottoms(on)
  await $.session.start(SESSION)
  await $.tool.call(TWO)
  const r = await $.prompt.submit(composer('what is a bottom sheet?'))
  expect(r.text).toBe('what is a bottom sheet?')
  expect(r.context).toEqual([`${HEAD}\n- settings: Drawer\n- features: Bento Grid\n${PENDING_TAIL}`])
  expect(k.submitted).toEqual(['what is a bottom sheet?'])
  expect(k.closed).toEqual([])
  const ui2 = await $.ui.mount(MOUNT)
  expect(await ui2.find({ text: 'Question 1 of 2' })).toBeDefined()
  // the next typed prompt carries the block again; a UI keyword adds no second request
  const r2 = await $.prompt.submit(composer('also add a settings page'))
  expect(r2.context).toEqual([`${HEAD}\n- settings: Drawer\n- features: Bento Grid\n${PENDING_TAIL}`])
  expect(await ui2.find({ text: 'Question 1 of 2' })).toBeDefined()
})

test('a pick already made is listed as such; an unanswered question shows its recommended id without a tag', async ($, on) => {
  bottoms(on)
  await $.session.start(SESSION)
  await $.tool.call(TWO)
  const ui2 = await $.ui.mount(MOUNT)
  await ui2.press({ key: 'pick-1' })
  const r = await $.prompt.submit(composer('hmm, which is better here?'))
  expect(r.context).toEqual([`${HEAD}\n- settings: Modal (your pick)\n- features: Bento Grid\n${PENDING_TAIL}`])
  expect(await ui2.find({ text: 'Question 2 of 2' })).toBeDefined()
})

test('a typed prompt in review carries the edited plan and leaves it in review; bridge prompts too; ko header', async ($, on) => {
  const k = bottoms(on)
  await $.session.start(SESSION)
  await $.tool.call(BAKERY)
  const ui2 = await $.ui.mount(MOUNT)
  await ui2.press({ key: 'pick-2' })
  await ui2.press({ key: 'row-2' })
  await ui2.select({ key: 'p-2-visible', value: '2' })
  const r = await $.prompt.submit({ text: '다크 모드로', wait: false, origin: { kind: 'bridge' } })
  expect(r.context).toEqual([
    `${KO_HEAD}\n- 상단 내비게이션: Sticky Header\n- 상단 영역: Hero Section\n- 빵 메뉴: Carousel (네 선택) · visible 2\n- 메뉴 카드: Hover Effect\n${PENDING_TAIL}`,
  ])
  expect(k.submitted).toEqual(['다크 모드로'])
  expect(k.closed).toEqual([])
  expect(await ui2.find({ key: 'build' })).toBeDefined()
  // Enter in the pane still builds the plan as edited
  await ui2.press({ key: 'build' })
  expect(k.submitted[1]).toBe('ui-picker: build\n- 상단 내비게이션: Sticky Header\n- 상단 영역: Hero Section\n- 빵 메뉴: Carousel (네 선택) · visible 2\n- 메뉴 카드: Hover Effect')
})

test('a bare digit typed while asking picks; the last one moves to review with a drop line', async ($, on) => {
  const k = bottoms(on)
  await $.session.start(SESSION)
  await $.tool.call(TWO)
  const r1 = await $.prompt.submit(composer(' 2 '))
  expect(r1.drop).toBe('ui-picker: option 2 recorded. Question 2 of 2 is in the pane.')
  expect(k.submitted).toEqual([])
  const ui2 = await $.ui.mount(MOUNT)
  expect(await ui2.find({ text: 'Question 2 of 2' })).toBeDefined()
  const r2 = await $.prompt.submit(composer('1'))
  expect(r2.drop).toBe('ui-picker: option 1 recorded. Review the plan in the pane; Enter builds.')
  expect(k.submitted).toEqual([])
  expect(k.opens.map(o => o.closeOnEscape)).toEqual([true, undefined])
  expect(await ui2.find({ text: 'settings · Modal' })).toBeDefined()
  expect(await ui2.find({ key: 'build' })).toBeDefined()
})

test('a digit with no matching option is dropped with the valid range and leaves the question pending', async ($, on) => {
  const k = bottoms(on)
  await $.session.start(SESSION)
  await $.tool.call(TWO)
  const r = await $.prompt.submit(composer('4'))
  expect(r.drop).toBe('ui-picker: no option 4. Press 1-3.')
  expect(k.submitted).toEqual([])
  const ui2 = await $.ui.mount(MOUNT)
  expect(await ui2.find({ text: 'Question 1 of 2' })).toBeDefined()
})

test('a bare digit typed in review or swapping is dropped with a pointer to the pane', async ($, on) => {
  const k = bottoms(on)
  await $.session.start(SESSION)
  await $.tool.call(call({ lang: 'en' }, ui('nav', 'sticky-header')))
  expect((await $.prompt.submit(composer('1'))).drop).toBe('ui-picker: the plan is in the pane. Press Enter there to build, or type your change.')
  const ui2 = await $.ui.mount(MOUNT)
  await ui2.press({ key: 'row-0' })
  await ui2.press({ key: 'swap' })
  expect((await $.prompt.submit(composer('2'))).drop).toBe('ui-picker: the plan is in the pane. Press Enter there to build, or type your change.')
  expect(await ui2.find({ text: 'Swap the pattern for nav' })).toBeDefined()
  expect(k.submitted).toEqual([])
})

test('ko: typed digit drop lines', async ($, on) => {
  bottoms(on)
  await $.session.start(SESSION)
  await $.tool.call({ ...TWO, lang: 'ko' })
  expect((await $.prompt.submit(composer('3'))).drop).toBe('ui-picker: 3번 선택 기록. 질문 2/2이 패널에 있습니다.')
  expect((await $.prompt.submit(composer('2'))).drop).toBe('ui-picker: 2번 기록. 패널에서 계획을 확인하고 Enter로 만드세요.')
  expect((await $.prompt.submit(composer('2'))).drop).toBe('ui-picker: 계획이 패널에 있습니다. 패널에서 Enter로 만들거나 바꿀 점을 입력하세요.')
})

test('task-notification prompt leaves the pending question alone', async ($, on) => {
  bottoms(on)
  await $.session.start(SESSION)
  await $.tool.call(TWO)
  const r = await $.prompt.submit({ text: 'Background task finished: 12 checks pass', wait: false, origin: { kind: 'task-notification' } })
  expect((r.context ?? []).some(c => c.startsWith('ui-picker:'))).toBe(false)
  const ui2 = await $.ui.mount(MOUNT)
  expect(await ui2.find({ text: 'Question 1 of 2' })).toBeDefined()
})

test('UI keyword prompt gets the ui-picker context when no plan is pending', async ($, on) => {
  bottoms(on)
  await $.session.start(SESSION)
  expect((await $.prompt.submit(composer('add a settings page'))).context).toEqual([UI_CONTEXT])
  expect((await $.prompt.submit(composer('설정 화면 만들어줘'))).context).toEqual([UI_CONTEXT])
  expect((await $.prompt.submit({ ...composer('new dashboard'), context: ['earlier'] })).context).toEqual(['earlier', UI_CONTEXT])
  for (const text of ['테이블 오더 키오스크를 만들고 싶어', 'build a kiosk app for a cafe', 'make me a website for my bakery', '포트폴리오 사이트 만들어줘']) {
    expect((await $.prompt.submit(composer(text))).context).toEqual([UI_CONTEXT])
  }
})

test('non-UI prompt gets no ui-picker context', async ($, on) => {
  bottoms(on)
  await $.session.start(SESSION)
  const prompts = [
    'fix the failing unit test',
    'list the files in src and summarize them',
    'add a database table for orders with a foreign key',
    'form a plan for migrating the CI pipeline',
    'parse the CSV into a list of dicts',
    '테이블에 인덱스 추가해줘',
    '목록을 정렬하는 함수 고쳐줘',
    '플랫폼 의존성을 제거해줘',
  ]
  for (const text of prompts) expect(((await $.prompt.submit(composer(text))).context ?? []).some(c => c.startsWith('ui-picker:'))).toBe(false)
})

test('slash command, meta and plugin prompts pass through untouched', async ($, on) => {
  bottoms(on)
  await $.session.start(SESSION)
  await $.tool.call(TWO)
  const cmd = await $.prompt.submit({ ...composer('/ui-picker'), command: { name: 'ui-picker', args: '' } })
  expect(cmd.context ?? []).toEqual([])
  const meta = await $.prompt.submit({ ...composer('settings page'), isMeta: true })
  expect(meta.context ?? []).toEqual([])
  const plugin = await $.prompt.submit({ text: 'settings page', wait: false, origin: { kind: 'plugin', name: 'other' } })
  expect(plugin.context ?? []).toEqual([])
  const ui2 = await $.ui.mount(MOUNT)
  expect(await ui2.find({ text: 'Question 1 of 2' })).toBeDefined()
})

test('a typed prompt in building or done adds keyword context only', async ($, on) => {
  const k = bottoms(on)
  await $.session.start(SESSION)
  await $.tool.call(call({ lang: 'en' }, ui('nav', 'sticky-header')))
  const ui2 = await $.ui.mount(MOUNT)
  await ui2.press({ key: 'build' })
  expect(k.submitted.length).toBe(1)
  const r = await $.prompt.submit(composer('also a footer section'))
  expect(r.context ?? []).toEqual([])
  expect((await $.prompt.submit(composer('new dashboard page'))).context).toEqual([UI_CONTEXT])
  expect(await ui2.find({ text: 'Building with these… (edits apply after)' })).toBeDefined()
})
