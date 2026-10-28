import { test, expect } from 'claude-code/testing'
import { bottoms, call, MOUNT, SESSION, TURN, TWO, ui } from './kit'

const BUILDING = 'Building with these… (edits apply after)'
const DONE = 'Built · 1-1: edit · Enter: send changes'
const START = { text: 'ui-picker: build', turnId: 't2' }

test('only the completion of the turn that started while building moves it to done', async ($, on) => {
  const k = bottoms(on)
  await $.session.start(SESSION)
  await $.tool.call(call({ lang: 'en' }, ui('nav', 'sticky-header')))
  const ui2 = await $.ui.mount(MOUNT)
  // the turn that called ui_pick ends while the plan is in review: nothing moves
  expect(await $.turn.complete(TURN)).toEqual({ text: 'Built it.' })
  expect(await ui2.find({ key: 'build' })).toBeDefined()
  await ui2.press({ key: 'build' })
  expect(k.submitted.length).toBe(1)
  expect(await ui2.find({ text: BUILDING })).toBeDefined()
  // Enter pressed while the ui_pick turn (t1) was still running: its completion is not the build's
  await $.turn.complete(TURN)
  expect(await ui2.find({ text: BUILDING })).toBeDefined()
  // the queued build turn starts (t2); a subagent's end is not its end either
  expect(await $.turn.start(START)).toEqual({ turnId: 't2' })
  await $.turn.complete({ ...TURN, turnId: 't2', agentId: 'agent-1' })
  expect(await ui2.find({ text: BUILDING })).toBeDefined()
  expect(await $.turn.complete({ ...TURN, turnId: 't2', answer: 'Done: the page is built.' })).toEqual({ text: 'Done: the page is built.' })
  expect(await ui2.find({ text: DONE })).toBeDefined()
  expect(await ui2.find({ key: 'build' })).toBeUndefined()
  // a later turn in done changes nothing
  await $.turn.start({ text: 'thanks', turnId: 't3' })
  await $.turn.complete({ ...TURN, turnId: 't3' })
  expect(await ui2.find({ text: DONE })).toBeDefined()
})

test('an aborted or errored build turn still ends building', async ($, on) => {
  bottoms(on)
  await $.session.start(SESSION)
  await $.tool.call(TWO)
  const ui2 = await $.ui.mount(MOUNT)
  await ui2.press({ key: 'pick-0' })
  await ui2.press({ key: 'pick-0' })
  await ui2.press({ key: 'build' })
  expect(await ui2.find({ text: BUILDING })).toBeDefined()
  await $.turn.start(START)
  await $.turn.complete({ ...TURN, turnId: 't2', answer: '', isAborted: true, reason: 'aborted' })
  expect(await ui2.find({ text: 'Built · 1-2: edit · Enter: send changes' })).toBeDefined()
})
