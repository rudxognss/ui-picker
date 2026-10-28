import { test, expect } from 'claude-code/testing'
import { buildMessage, changeMessage, line, pendingContext } from '../hooks/format'
import { PENDING_TAIL } from '../hooks/trigger'
import { validatePick } from '../hooks/schema'
import { applyPick, resolveRemaining, setNote, setParam, settle, swapRow } from '../hooks/state'
import { BAKERY, call, ui } from './kit'

const plan = (input: Record<string, unknown>) => {
  const { tool, ...rest } = input
  const r = validatePick(rest)
  if (!r.ok) throw new Error(r.deny)
  return r.value
}

const BUILT = [
  'ui-picker: build',
  '- 상단 내비게이션: Sticky Header',
  '- 상단 영역: Hero Section',
  '- 빵 메뉴: Card Layout (네 선택) · cols 4 · gap 16px',
  '- 메뉴 카드: Hover Effect (변경) · lift 4px · "그림자도 살짝"',
].join('\n')

test('buildMessage: the bakery message of the spec after cols 4, gap 16, lift 4 and a note', async () => {
  let p = settle(applyPick(plan(BAKERY), 2, 0, 'user'))
  p = setParam(p, 2, 'cols', 4)
  p = setParam(p, 2, 'gap', 16)
  p = setParam(p, 3, 'lift', 4)
  p = setNote(p, 3, '그림자도 살짝')
  expect(buildMessage(p)).toBe(BUILT)
})

test('line: English header and term names in both languages; defaults are not listed; tags per source', async () => {
  const en = settle(resolveRemaining(plan(call({ lang: 'en' }, ui('nav', 'sticky-header'), ui('menu', ['carousel', 'card-layout'])))))
  expect(buildMessage(en)).toBe('ui-picker: build\n- nav: Sticky Header\n- menu: Carousel (recommended)')
  expect(line(setParam(en, 1, 'visible', 2), 1)).toBe('- menu: Carousel (recommended) · visible 2')
  const ko = settle(resolveRemaining(plan(call({ lang: 'ko' }, ui('메뉴', ['carousel', 'card-layout'])))))
  expect(line(ko, 0)).toBe('- 메뉴: Carousel (추천 적용)')
  // a swapped model row reads changed; params of the new term list against its own defaults
  const sw = setParam(swapRow(en, 0, 'sidebar-layout'), 0, 'width', 300)
  expect(line(sw, 0)).toBe('- nav: Sidebar Layout (changed) · width 300px')
  // a param set back to its default is not listed and the row is no longer changed
  expect(line(setParam(setParam(en, 0, 'height', 72), 0, 'height', 64), 0)).toBe('- nav: Sticky Header')
})

test('changeMessage lists only the rows that differ from the last message', async () => {
  const p = settle(resolveRemaining(plan(BAKERY)))
  const sent = { ...p, sent: p.decisions }
  expect(changeMessage(sent)).toBe('ui-picker: change')
  const edited = setNote(setParam(sent, 0, 'height', 72), 3, 'softer')
  expect(changeMessage(edited)).toBe('ui-picker: change\n- 상단 내비게이션: Sticky Header (변경) · height 72px\n- 메뉴 카드: Hover Effect (변경) · "softer"')
})

test('pendingContext: localized header, every decision, the tail that says what to do', async () => {
  const ko = settle(resolveRemaining(plan(BAKERY)))
  expect(pendingContext(ko)).toBe(
    `ui-picker: 패널에 확인 대기 중인 계획이 있습니다 (아직 확정 아님):\n- 상단 내비게이션: Sticky Header\n- 상단 영역: Hero Section\n- 빵 메뉴: Card Layout (추천 적용)\n- 메뉴 카드: Hover Effect\n${PENDING_TAIL}`,
  )
  const en = settle(plan(call({ lang: 'en' }, ui('nav', 'sticky-header'))))
  expect(pendingContext(en)).toBe(`ui-picker: a plan is pending in the pane; the person has not confirmed it:\n- nav: Sticky Header\n${PENDING_TAIL}`)
  expect(PENDING_TAIL).toContain('Do not build from this block.')
})
