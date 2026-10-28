import { test, expect } from 'claude-code/testing'
import { bottoms, call, MOUNT, SESSION, TURN, TWO, ui } from './kit'

const MSG = 'ui-picker: build\n- settings: Modal (your pick)\n- features: Bento Grid (your pick)'

test('a dropped build submit fills the prompt box, toasts and logs the reason, and the pane stays in building', async ($, on) => {
  const k = bottoms(on, { drop: 'blocked by a settings hook' })
  await $.session.start(SESSION)
  await $.tool.call(TWO)
  const ui2 = await $.ui.mount(MOUNT)
  await ui2.press({ key: 'pick-1' })
  await ui2.press({ key: 'pick-0' })
  await ui2.press({ key: 'build' })
  expect(k.submitted).toEqual([MSG])
  expect(k.filled).toEqual([MSG])
  expect(k.toasts).toEqual(['ui-picker: message not delivered (blocked by a settings hook). It is in the prompt box; press Enter to send.'])
  expect(k.logged).toEqual(k.toasts)
  expect(await ui2.find({ text: 'Building with these… (edits apply after)' })).toBeDefined()
  expect(await ui2.find({ key: 'build' })).toBeUndefined()
  // the person's own Enter then sends it as a composer prompt: no context block is added twice
  const r = await $.prompt.submit({ text: MSG, wait: false, origin: { kind: 'composer' } })
  expect(r.context ?? []).toEqual([])
  await $.turn.start({ text: 'ui-picker: build', turnId: TURN.turnId })
  await $.turn.complete(TURN)
  expect(await ui2.find({ text: 'Built · 1-2: edit · Enter: send changes' })).toBeDefined()
})

test('ko: the drop line is localized', async ($, on) => {
  const k = bottoms(on, { drop: 'a Stop stands' })
  await $.session.start(SESSION)
  await $.tool.call(call({ lang: 'ko' }, ui('내비', 'sticky-header')))
  const ui2 = await $.ui.mount(MOUNT)
  await ui2.press({ key: 'build' })
  expect(k.filled).toEqual(['ui-picker: build\n- 내비: Sticky Header'])
  expect(k.toasts).toEqual(['ui-picker: 메시지가 전달되지 않았습니다 (a Stop stands). 입력창에 넣어 두었으니 Enter로 보내세요.'])
})
