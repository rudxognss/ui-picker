import { test, expect } from 'claude-code/testing'
import { stillPending } from '../hooks/trigger'
import { bottoms, call, MOUNT, SESSION, TWO, ui } from './kit'

const B = call({ lang: 'en' }, ui('z1', ['tabs', 'accordion']))
const asked = (r: unknown) => JSON.parse((r as any).result as string)

test('a second ui_pick while asking is denied and the first set stays intact', async ($, on) => {
  const k = bottoms(on)
  await $.session.start(SESSION)
  expect(asked(await $.tool.call(TWO))).toEqual({ review: true, questions: 2 })
  expect((await $.tool.call(B) as any).deny).toBe(stillPending('asking', 0, 2))
  const ui2 = await $.ui.mount(MOUNT)
  expect(await ui2.find({ text: 'Question 1 of 2' })).toBeDefined()
  expect(await ui2.find({ text: 'z1' })).toBeUndefined()
  await ui2.press({ key: 'pick-1' })
  expect((await $.tool.call(B) as any).deny).toBe(
    'ui-picker: a question set is still pending (1/2 answered). Do not ask again and do not build; wait for the "ui-picker: build" message.',
  )
  expect(await ui2.find({ text: 'Question 2 of 2' })).toBeDefined()
  await ui2.press({ key: 'pick-0' })
  expect((await $.tool.call(B) as any).deny).toBe('ui-picker: the plan is under review in the pane. Do not build; wait for the "ui-picker: build" message.')
  expect(await ui2.find({ text: 'settings · Modal' })).toBeDefined()
  expect(k.submitted).toEqual([])
})

test('two ui_pick calls in flight at once: exactly one is accepted', async ($, on) => {
  bottoms(on)
  await $.session.start(SESSION)
  const rs = (await Promise.all([$.tool.call(TWO), $.tool.call(B)])) as any[]
  expect(rs.filter(r => typeof r.result === 'string' && JSON.parse(r.result).review === true).length).toBe(1)
  expect(rs.filter(r => typeof r.deny === 'string' && r.deny.startsWith('ui-picker: a question set is still pending')).length).toBe(1)
})

test('ui_pick after Build is accepted again and replaces the plan', async ($, on) => {
  const k = bottoms(on)
  await $.session.start(SESSION)
  await $.tool.call(TWO)
  const ui2 = await $.ui.mount(MOUNT)
  await ui2.press({ key: 'pick-1' })
  await ui2.press({ key: 'pick-0' })
  await ui2.press({ key: 'build' })
  expect(k.submitted.length).toBe(1)
  expect(asked(await $.tool.call(B))).toEqual({ review: true, questions: 1 })
  expect(await ui2.find({ text: 'Question 1 of 1' })).toBeDefined()
  expect(await ui2.find({ text: '1: Tabs · recommended' })).toBeDefined()
})
