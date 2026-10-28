import type { Decision, Plan } from '../types'
import { changed, diff } from './state'
import { t } from './strings'
import { TERMS } from './terms'
import { PENDING_TAIL } from './trigger'

/** `(your pick)` / `(recommended)` by source; a model row the person edited reads `(changed)`. */
function tag(p: Plan, i: number): string {
  const d = p.decisions[i]!
  if (d.source === 'user') return ` (${t(p, 'sourceUser')})`
  if (d.source === 'recommended') return ` (${t(p, 'sourceRecommended')})`
  return changed(p, i) ? ` (${t(p, 'changedTag')})` : ''
}

/** Params that differ from the card default, English keys, unit attached. */
function params(d: Decision): string[] {
  return (TERMS[d.term]?.params ?? [])
    .filter(s => d.params[s.key] !== undefined && String(d.params[s.key]) !== String(s.def))
    .map(s => `${s.key} ${d.params[s.key]}${s.unit ?? ''}`)
}

export function line(p: Plan, i: number): string {
  const d = p.decisions[i]!
  const parts = [`${TERMS[d.term]?.en ?? d.term}${tag(p, i)}`, ...params(d)]
  if (d.note) parts.push(`"${d.note}"`)
  return `- ${d.area}: ${parts.join(' · ')}`
}

const lines = (p: Plan, rows: number[]): string[] => rows.map(i => line(p, i))
const all = (p: Plan): number[] => p.decisions.map((_, i) => i)

/** User message after Enter on Build: every decision. */
export function buildMessage(p: Plan): string {
  return ['ui-picker: build', ...lines(p, all(p))].join('\n')
}

/** User message after Enter on Send changes: the rows that differ from the last message. */
export function changeMessage(p: Plan): string {
  return ['ui-picker: change', ...lines(p, diff(p))].join('\n')
}

/** Context block beside a prompt typed while the plan is pending: every decision, then what the model may do with it. */
export function pendingContext(p: Plan): string {
  return [t(p, 'pendingHead'), ...lines(p, all(p)), PENDING_TAIL].join('\n')
}
