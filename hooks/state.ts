import type { Decision, Lang, Mode, PaneState, Plan, Source } from '../types'
import { defaultsOf } from './terms'

export type { Decision, Lang, Mode, PaneState, Plan, Source } from '../types'

export const IDLE: PaneState = { mode: 'idle' }

/** Modes in which a plan is in the person's hands: a new ui_pick is denied, a typed prompt confirms it. */
export const PENDING: readonly Mode[] = ['asking', 'review', 'swapping']
export const isPending = (mode: Mode): boolean => PENDING.includes(mode)

const HANGUL = /[ㄱ-힣]/
export function inferLang(title: string | undefined, areas: readonly string[]): Lang {
  return HANGUL.test(title ?? '') || areas.some(a => HANGUL.test(a)) ? 'ko' : 'en'
}

/** State is JSON; a deep copy keeps `original` apart from later edits. */
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T

const isAsked = (d: Decision): boolean => d.options !== undefined

export const questions = (p: Plan): number => p.decisions.filter(isAsked).length

/** First asked row without an answer; undefined once every question is answered. */
export function cursor(p: Plan): number | undefined {
  const i = p.decisions.findIndex(d => isAsked(d) && !d.picked)
  return i < 0 ? undefined : i
}

export const answered = (p: Plan): number => p.decisions.filter(d => isAsked(d) && d.picked).length

const withRow = (p: Plan, row: number, d: Decision): Plan => ({ ...p, decisions: p.decisions.map((x, i) => (i === row ? d : x)) })

export function applyPick(p: Plan, row: number, optionIndex: number, source: Source): Plan {
  const d = p.decisions[row]
  const id = d?.options?.[optionIndex]
  if (!d || id === undefined) return p
  return withRow(p, row, { ...d, term: id, params: defaultsOf(id), source, picked: true })
}

/** Every unanswered question takes its recommended option. */
export function resolveRemaining(p: Plan): Plan {
  return {
    ...p,
    decisions: p.decisions.map(d =>
      isAsked(d) && !d.picked ? { ...d, term: d.options![0]!, params: defaultsOf(d.options![0]!), source: 'recommended' as const, picked: true as const } : d,
    ),
  }
}

export const settle = (p: Plan): Plan => ({ ...p, original: clone(p.decisions) })

export function setParam(p: Plan, row: number, key: string, value: string | number): Plan {
  const d = p.decisions[row]
  if (!d) return p
  return withRow(p, row, { ...d, params: { ...d.params, [key]: value } })
}

export function setNote(p: Plan, row: number, text: string): Plan {
  const d = p.decisions[row]
  if (!d) return p
  const note = text.trim().slice(0, 200)
  const { note: old, ...rest } = d
  return withRow(p, row, note ? { ...rest, note } : rest)
}

export function swapRow(p: Plan, row: number, id: string): Plan {
  const d = p.decisions[row]
  if (!d) return p
  return withRow(p, row, { ...d, term: id, params: defaultsOf(id) })
}

export function resetRow(p: Plan, row: number): Plan {
  const d = p.decisions[row]
  const o = p.original[row]
  if (!d || !o) return p
  const { note, ...rest } = d
  const back: Decision = { ...rest, term: o.term, params: clone(o.params) }
  if (o.note !== undefined) back.note = o.note
  return withRow(p, row, back)
}

/** What an edit can change on a row. */
const sig = (d: Decision | undefined): string => (d ? JSON.stringify({ term: d.term, params: d.params, note: d.note }) : '')

export const changed = (p: Plan, i: number): boolean => p.original[i] !== undefined && sig(p.decisions[i]) !== sig(p.original[i])

/** Rows whose term, params or note differ from the last message sent. */
export function diff(p: Plan): number[] {
  const out: number[] = []
  p.decisions.forEach((d, i) => {
    if (sig(d) !== sig(p.sent?.[i])) out.push(i)
  })
  return out
}
