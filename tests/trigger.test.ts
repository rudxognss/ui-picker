import { test, expect } from 'claude-code/testing'
import { ASK_OPEN, META, PROMPT_SECTION, REVIEW_OPEN, SHOW_OPEN, stillPending, UI_CONTEXT, UI_KEYWORDS } from '../hooks/trigger'
import { bottoms, composer, SESSION, TWO } from './kit'

const fires = (text: string): boolean => UI_KEYWORDS.test(text) && !META.test(text)

test('trigger: UI requests fire; the mod\'s own wire echoed in a prompt does not', async () => {
  for (const text of ['빵집 사이트 하나 만들어보자', 'new dashboard', 'add a settings page', '설정 화면 만들어줘']) expect(fires(text)).toBe(true)
  expect(fires('ui_board (MCP)(lang: "ko", decisions: [...])')).toBe(false)
  expect(fires('the ui-picker pane shows the settings page')).toBe(false)
  expect(fires('mcp__ui-picker__ui_pick returned {"review":true,"questions":1} for the page')).toBe(false)
  expect(fires('fix the failing unit test')).toBe(false)
})

test('trigger: prompt.submit adds UI_CONTEXT under the META guard', async ($, on) => {
  bottoms(on)
  await $.session.start(SESSION)
  expect((await $.prompt.submit(composer('빵집 사이트 하나 만들어보자'))).context).toEqual([UI_CONTEXT])
  const echo = await $.prompt.submit(composer('ui_board (MCP)(lang: "ko", decisions: [{ area: "page" }])'))
  expect(echo.context ?? []).toEqual([])
  const kept = await $.prompt.submit({ ...composer('new dashboard'), context: ['earlier'] })
  expect(kept.context).toEqual(['earlier', UI_CONTEXT])
})

test('trigger: section and opens as the spec writes them', async () => {
  expect(PROMPT_SECTION.split('\n').length).toBe(4)
  expect(PROMPT_SECTION).toContain('Call mcp__ui-picker__ui_pick once: {title?, lang, ui, params?, labels?}.')
  expect(PROMPT_SECTION).toContain('one line meaning "Check the right pane." in the person\'s language (ko: 오른쪽 패널을 확인하세요.)')
  expect(PROMPT_SECTION).toContain('"ui-picker: build"')
  expect(PROMPT_SECTION).toContain('"ui-picker: a plan is pending"')
  expect(PROMPT_SECTION).toContain('Never build from that block.')
  expect(PROMPT_SECTION).toContain('"ui-picker: change"')
  expect(UI_CONTEXT).toBe('ui-picker: UI request. Apply ui-vocab: call ui_pick once (areas -> ids), then end the turn with "Check the right pane."')
  expect(ASK_OPEN).toEqual({ id: 'ui-picker', title: 'ui-picker', focus: true, closeOnEscape: true, rows: 30, columns: 86 })
  expect(REVIEW_OPEN).toEqual({ id: 'ui-picker', title: 'ui-picker', focus: true, rows: 30, columns: 86 })
  expect(SHOW_OPEN).toEqual({ id: 'ui-picker', title: 'ui-picker', rows: 24, columns: 86 })
})

test('trigger: stillPending by mode', async ($, on) => {
  bottoms(on)
  await $.session.start(SESSION)
  expect(stillPending('asking', 1, 2)).toBe(
    'ui-picker: a question set is still pending (1/2 answered). Do not ask again and do not build; wait for the "ui-picker: build" message.',
  )
  const review = 'ui-picker: the plan is under review in the pane. Do not build; wait for the "ui-picker: build" message.'
  expect(stillPending('review', 2, 2)).toBe(review)
  expect(stillPending('swapping', 2, 2)).toBe(review)
  await $.tool.call(TWO)
  expect((await $.tool.call(TWO) as any).deny).toBe(stillPending('asking', 0, 2))
})
