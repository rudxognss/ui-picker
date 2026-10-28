import { test, expect } from 'claude-code/testing'
import { validatePick } from '../hooks/schema'
import {
  answered,
  applyPick,
  changed,
  cursor,
  diff,
  questions,
  resetRow,
  resolveRemaining,
  setNote,
  setParam,
  settle,
  swapRow,
} from '../hooks/state'
import { BAKERY, TWO } from './kit'

const plan = (input: Record<string, unknown>) => {
  const { tool, ...rest } = input
  const r = validatePick(rest)
  if (!r.ok) throw new Error(r.deny)
  return r.value
}

test('questions, cursor and answered follow the asked rows', async () => {
  const p = plan(TWO)
  expect(questions(p)).toBe(2)
  expect(cursor(p)).toBe(0)
  expect(answered(p)).toBe(0)
  const p1 = applyPick(p, 0, 1, 'user')
  expect(p1.decisions[0]).toEqual({ area: 'settings', term: 'modal', params: { width: 560, backdrop: 'dim', full_below: 640 }, source: 'user', options: ['drawer', 'modal', 'bottom-sheet'], picked: true })
  expect(cursor(p1)).toBe(1)
  expect(answered(p1)).toBe(1)
  const p2 = applyPick(p1, 1, 0, 'user')
  expect(cursor(p2)).toBeUndefined()
  expect(answered(p2)).toBe(2)
  // an option index past the row's candidates changes nothing
  expect(applyPick(p, 0, 7, 'user')).toBe(p)
})

test('resolveRemaining settles the rest as recommended', async () => {
  const p = plan(TWO)
  const r = resolveRemaining(applyPick(p, 0, 2, 'user'))
  expect(r.decisions[0]!.source).toBe('user')
  expect(r.decisions[1]).toEqual({ area: 'features', term: 'bento-grid', params: { cols: 4, feature: '2x2', gap: 16 }, source: 'recommended', options: ['bento-grid', 'card-layout'], picked: true })
  expect(cursor(r)).toBeUndefined()
})

test('settle snapshots; edits mark changed; reset restores; sources never move', async () => {
  const p = settle(resolveRemaining(plan(BAKERY)))
  expect(p.original).toEqual(p.decisions)
  expect(p.original).not.toBe(p.decisions)
  expect(changed(p, 2)).toBe(false)
  const e1 = setParam(p, 2, 'cols', 4)
  expect(e1.decisions[2]!.params).toEqual({ cols: 4, md: 2, sm: 1, gap: 24 })
  expect(changed(e1, 2)).toBe(true)
  expect(e1.original[2]!.params.cols).toBe(3)
  const e2 = setNote(e1, 3, '  그림자도 살짝  ')
  expect(e2.decisions[3]!.note).toBe('그림자도 살짝')
  expect(changed(e2, 3)).toBe(true)
  expect(setNote(e2, 3, '   ').decisions[3]!.note).toBeUndefined()
  expect('note' in setNote(e2, 3, '').decisions[3]!).toBe(false)
  expect(setNote(e2, 3, 'x'.repeat(300)).decisions[3]!.note!.length).toBe(200)
  const s = swapRow(e2, 3, 'micro-interaction')
  expect(s.decisions[3]!.term).toBe('micro-interaction')
  expect(s.decisions[3]!.params).toEqual({ ms: 150, feedback: 'scale' })
  expect(s.decisions[3]!.source).toBe('model')
  const back = resetRow(s, 3)
  expect(back.decisions[3]!.term).toBe('hover-effect')
  expect(back.decisions[3]!.params).toEqual({ lift: 2, ms: 150, focus: 'same' })
  expect(back.decisions[3]!.note).toBeUndefined()
  expect(changed(back, 3)).toBe(false)
  // a user pick stays a user pick through every edit
  expect(resetRow(swapRow(e1, 2, 'carousel'), 2).decisions[2]!.source).toBe('recommended')
})

test('diff compares against what was sent', async () => {
  const p = settle(resolveRemaining(plan(BAKERY)))
  expect(diff(p)).toEqual([0, 1, 2, 3])
  const sent = { ...p, sent: p.decisions }
  expect(diff(sent)).toEqual([])
  expect(diff(setParam(sent, 0, 'height', 72))).toEqual([0])
  expect(diff(setNote(setParam(sent, 0, 'height', 72), 3, 'softer'))).toEqual([0, 3])
})
