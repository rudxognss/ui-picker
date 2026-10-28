import type { EngineInterface } from 'claude-code'
import { atom, read, update } from 'claude-code'
import { stopAnimation } from './animate'
import { buildMessage, changeMessage } from './format'
import { mirror } from './mirror'
import type { L } from '../types'
import type { PaneState, Plan } from './state'
import { diff, IDLE } from './state'
import { t } from './strings'

// The state library's scan reads the atom where it is used: one per file.
const PANE = atom({ plugin: 'ui-picker', key: 'pane' } as const, IDLE)

/**
 * Submits a message as the person's own. A dropped submission (a settings hook's block, a standing Stop, a host limit) is handed to the person
 * instead: the text goes into the prompt box, where their own Enter sends it as a composer prompt that none of those causes applies to; the
 * state is already `building`, so this plugin's prompt.submit hook adds nothing twice.
 */
async function deliver($: EngineInterface, l: L, text: string): Promise<void> {
  let drop: string | undefined
  try {
    drop = (await $.prompt.submit({ text, asUser: true })).drop
  } catch (err) {
    drop = err instanceof Error ? err.message : String(err)
  }
  if (drop === undefined) return
  const filled = await $.prompt.fill({ text, mode: 'append' }).then(f => f.isFilled, () => false)
  const line = t(l, filled ? 'notDeliveredFilled' : 'notDeliveredTyped', { reason: drop })
  $.ui.toast(line, { timeoutMs: 8000 })
  $.ui.log(line)
}

/** `sent = decisions`, mode building; the message is composed from the plan as it goes out. Returns undefined when the mode did not allow it. */
async function send($: EngineInterface, from: PaneState['mode'], compose: (p: Plan) => string): Promise<void> {
  const found: { plan?: Plan } = {}
  const written = await update($, PANE, s => {
    if (s.mode !== from || !s.plan) return s
    const { expanded, swapping, turn, prompted, ...rest } = s.plan
    // The message is composed from the plan before `sent` moves: a change message diffs against the previous one.
    found.plan = rest
    const next: PaneState = { mode: 'building', plan: { ...rest, sent: s.plan.decisions } }
    if (s.images !== undefined) next.images = s.images
    return next
  })
  if (!found.plan) return
  await mirror($, written)
  stopAnimation()
  // The pane's job ends with the answer: it closes; /ui-picker reopens the plan (done mode) for changes.
  await $.ui.close({ id: 'ui-picker' })
  await deliver($, found.plan, compose(found.plan))
}

/** Enter on Build (review): the build message. */
export function confirm($: EngineInterface): Promise<void> {
  return send($, 'review', buildMessage)
}

/** Enter on Send changes (done): the change message, rows that differ from the last one; nothing when none differ. */
export async function sendChanges($: EngineInterface): Promise<void> {
  const s = await read($, PANE)
  if (s.mode !== 'done' || !s.plan || diff(s.plan).length === 0) return
  await send($, 'done', changeMessage)
}
