import { test, expect } from 'claude-code/testing'
import { validatePick } from '../hooks/schema'
import { IDLE_LINE, PENDING_TAIL, stillPending } from '../hooks/trigger'
import { BAKERY, bottoms, call, composer, MOUNT, RUN, SESSION, TURN, TWO, ui } from './kit'

const asked = (r: unknown) => JSON.parse((r as any).result as string)
const HEAD = 'ui-picker: a plan is pending in the pane; the person has not confirmed it:'

test('stuck mid-plan: a question typed while asking is answered, the plan stays; the same ui_pick turn is still denied', async ($, on) => {
  const k = bottoms(on)
  await $.session.start(SESSION)
  await $.tool.call(TWO)
  // the ui_pick turn ends, the person is on question 1
  await $.turn.complete(TURN)
  const r = await $.prompt.submit(composer('how do I reopen the pane?'))
  expect(r.context?.[0]).toBe(`${HEAD}\n- settings: Drawer\n- features: Bento Grid\n${PENDING_TAIL}`)
  expect(k.closed).toEqual([])
  await $.turn.start({ text: 'how do I reopen the pane?', turnId: 't2' })
  await $.turn.complete({ ...TURN, turnId: 't2', answer: '/ui-picker reopens it.' })
  const ui2 = await $.ui.mount(MOUNT)
  expect(await ui2.find({ text: 'Question 1 of 2' })).toBeDefined()
  // the person goes on in the pane as if nothing happened
  await ui2.press({ key: 'pick-2' })
  await ui2.press({ key: 'pick-1' })
  await ui2.press({ key: 'build' })
  expect(k.submitted.at(-1)).toBe('ui-picker: build\n- settings: Bottom Sheet (your pick)\n- features: Card Layout (your pick)')
})

test('a change typed while pending lets the model re-plan: the next ui_pick replaces the plan; a re-ask without a prompt in between is denied', async ($, on) => {
  const k = bottoms(on)
  await $.session.start(SESSION)
  await $.tool.call(BAKERY)
  expect((await $.tool.call(TWO) as any).deny).toBe(stillPending('asking', 0, 1))
  await $.prompt.submit(composer('빵 메뉴는 카드로 하고 푸터도 넣어줘'))
  const replaced = call({ title: '빵집 사이트' }, ui('상단 내비게이션', 'sticky-header'), ui('빵 메뉴', 'card-layout'), ui('푸터', ['accordion', 'tabs']))
  expect(asked(await $.tool.call(replaced))).toEqual({ review: true, questions: 1 })
  const ui2 = await $.ui.mount(MOUNT)
  expect(((await ui2.find({ key: 'pick-0' })) as any)?.props.label).toBe('1: 아코디언 · 추천')
  expect(await ui2.find({ key: 'pick-2' })).toBeUndefined()
  // the replacement is a fresh plan: a second call in the same turn is a re-ask again
  expect((await $.tool.call(TWO) as any).deny).toBe(stillPending('asking', 0, 1))
  expect(k.submitted).toEqual(['빵 메뉴는 카드로 하고 푸터도 넣어줘'])
})

test('a go-ahead typed in review: the model re-sends the same plan decided; the pane opens at review for Enter', async ($, on) => {
  const k = bottoms(on)
  await $.session.start(SESSION)
  await $.tool.call(call({ lang: 'en' }, ui('nav', ['sticky-header', 'sidebar-layout'])))
  const ui2 = await $.ui.mount(MOUNT)
  await ui2.press({ key: 'pick-0' })
  await $.prompt.submit(composer('go ahead'))
  expect(asked(await $.tool.call(call({ lang: 'en' }, ui('nav', 'sticky-header'))))).toEqual({ review: true, questions: 0 })
  expect(await ui2.find({ key: 'build' })).toBeDefined()
  await ui2.press({ key: 'build' })
  expect(k.submitted.at(-1)).toBe('ui-picker: build\n- nav: Sticky Header')
})

test('a plan in review survives the turn ending and comes back with /ui-picker', async ($, on) => {
  bottoms(on)
  await $.session.start(SESSION)
  await $.tool.call(TWO)
  const ui2 = await $.ui.mount(MOUNT)
  await ui2.press({ key: 'pick-1' })
  await ui2.press({ key: 'pick-0' })
  await $.turn.complete(TURN)
  expect(await $.command.run(RUN)).toEqual({ text: 'plan opened for review.' })
  expect(await ui2.find({ key: 'build' })).toBeDefined()
})

test('every write mirrors the pane to the store under this session; a confirmed plan is mirrored as building', async ($, on) => {
  const k = bottoms(on)
  await $.session.start(SESSION)
  await $.tool.call(TWO)
  expect((k.store['pane'] as any).session).toBe('sess-1')
  expect((k.store['pane'] as any).state.mode).toBe('asking')
  const ui2 = await $.ui.mount(MOUNT)
  await ui2.press({ key: 'pick-1' })
  await ui2.press({ key: 'pick-0' })
  expect((k.store['pane'] as any).state.mode).toBe('review')
  await ui2.press({ key: 'build' })
  expect((k.store['pane'] as any).state.mode).toBe('building')
})

test('an empty session state comes back from this session\'s mirror; another session\'s mirror is ignored', async ($, on) => {
  const k = bottoms(on)
  await $.session.start(SESSION)
  const plan = validatePick(TWO)
  if (!plan.ok) throw new Error(plan.deny)
  k.store['pane'] = { session: 'sess-0', state: { mode: 'asking', plan: plan.value } }
  expect(await $.command.run(RUN)).toEqual({ text: IDLE_LINE })
  k.store['pane'] = { session: 'sess-1', state: { mode: 'asking', plan: plan.value } }
  expect(await $.command.run(RUN)).toEqual({ text: 'pending question opened.' })
  const ui2 = await $.ui.mount(MOUNT)
  expect(await ui2.find({ text: 'Question 1 of 2' })).toBeDefined()
  // the recovered plan is live: a ui_pick is a re-ask, a typed prompt carries it
  expect((await $.tool.call(BAKERY) as any).deny).toBe(stillPending('asking', 0, 2))
  expect((await $.prompt.submit(composer('which one?'))).context?.[0]).toContain('- settings: Drawer')
})

test('/clear while a plan is pending: the state is reset so the fresh conversation can plan again', async ($, on) => {
  const k = bottoms(on)
  await $.session.start(SESSION)
  await $.tool.call(TWO)
  await $.session.end({ reason: 'clear', sessionId: 'sess-1', resume: { id: 'sess-1' } })
  expect(k.closed).toEqual([{ id: 'ui-picker', origin: 'plugin' }])
  expect(k.store['pane']).toBeUndefined()
  expect(asked(await $.tool.call(BAKERY))).toEqual({ review: true, questions: 1 })
})
