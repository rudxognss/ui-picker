import type { EngineInterface, PromptComposeSection, Register } from 'claude-code'
import { atom, read, update } from 'claude-code'
import type { Target } from './animate'
import { startAnimation, stopAnimation } from './animate'
import { confirm, sendChanges } from './confirm'
import { pendingContext } from './format'
import { mirror, mirrored } from './mirror'
import type { Ask } from './render-picker'
import { askOf, pickerTree, previewTargets } from './render-picker'
import { reviewTargets, reviewTree } from './render-review'
import { UI_PICK_SCHEMA, validatePick } from './schema'
import type { Mode, PaneState, Plan } from './state'
import {
  answered,
  applyPick,
  cursor,
  IDLE,
  isPending,
  PENDING,
  questions,
  resetRow,
  resolveRemaining,
  setNote,
  setParam,
  settle,
  swapRow,
} from './state'
import { t } from './strings'
import { TERMS, parseValue } from './terms'
import {
  ASK_OPEN,
  DISABLED_LINE,
  IDLE_LINE,
  META,
  notPlaced,
  PROMPT_SECTION,
  PROMPT_SECTION_ID,
  REVIEW_OPEN,
  SHOW_OPEN,
  stillPending,
  UI_CONTEXT,
  UI_KEYWORDS,
} from './trigger'

const PANE = atom({ plugin: 'ui-picker', key: 'pane' } as const, IDLE)
const PICK_TOOL = 'mcp__ui-picker__ui_pick'
const RULES: PromptComposeSection = { id: PROMPT_SECTION_ID, text: PROMPT_SECTION, scope: 'session' }
const PICK_DESCRIPTION =
  'Plan the UI of a request: every UI area in page order -> one term id (decided) or 2-4 ids (ask; first = recommended; max 3 such areas). The pane asks, then lets the person edit numbers and confirm; the plan returns as a user message starting "ui-picker: build". lang = the person\'s language; for a language other than en/ko also send labels (pane strings and term texts in that language). Call once per request, then end the turn.'
/** A bare digit typed into the composer while the plan is in the pane: while asking, the pick the pane's hotkey would have taken. */
const BARE_DIGIT = /^\s*([1-9])\s*$/

let enabled = false
let targets: readonly Target[] = []
let picking = false

/** Keeps the session's image verdict across state transitions. */
const withImages = (next: PaneState, cur: PaneState): PaneState => (cur.images === undefined ? next : { ...next, images: cur.images })

/** Re-arms the preview loop; a terminal that cannot draw Images flips the session to Raster previews, which redraws the pane. */
function animate($: EngineInterface): void {
  startAnimation($, 'ui-picker', () => targets, {
    onImagesUnsupported: async () => {
      stopAnimation()
      await put($, s => {
        const next: PaneState = { ...s, images: false }
        return next
      })
    },
  })
}

function argsOf(e: unknown): Record<string, unknown> {
  const { tool, tool_use_id, agentId, requestMeta, consent, ...input } = e as Record<string, unknown>
  return input
}

/** Edits the plan in place when the pane is in one of `modes`; the mode stays. */
async function edit($: EngineInterface, modes: readonly Mode[], f: (p: Plan, mode: Mode) => Plan): Promise<void> {
  await put($, s => (s.plan && modes.includes(s.mode) ? { ...s, plan: f(s.plan, s.mode) } : s))
}

/** Moves the pane to `modeOf(plan)` with a plan derived from the current one, when the pane is in one of `from`. */
async function move($: EngineInterface, from: readonly Mode[], modeOf: (p: Plan) => Mode, f: (p: Plan) => Plan): Promise<void> {
  await put($, s => {
    if (!s.plan || !from.includes(s.mode)) return s
    const plan = f(s.plan)
    return withImages({ mode: modeOf(plan), plan }, s)
  })
}

const openOf = (mode: Mode) => (mode === 'asking' ? ASK_OPEN : mode === 'review' || mode === 'swapping' ? REVIEW_OPEN : SHOW_OPEN)

/** Where swapping returns: done once a message went out, review before. */
const after = (p: Plan): Mode => (p.sent ? 'done' : 'review')

const drop = <T extends object>(p: T, ...keys: (keyof T)[]): T => {
  const out = { ...p }
  for (const k of keys) delete out[k]
  return out
}

/** A pending plan the person has not spoken over since: a new ui_pick is a re-ask and is denied. Once they typed, ui_pick replaces it. */
const busy = (s: PaneState): boolean => s.plan !== undefined && isPending(s.mode) && !s.plan.prompted

/** Writes the pane and mirrors it to the store. Every write goes through here. */
const put = async ($: EngineInterface, f: (s: PaneState) => PaneState): Promise<PaneState> => mirror($, await update($, PANE, f))

/** The pane state; when the session state is empty, this session's mirror put back (a lost pane after a close by hand). */
async function recover($: EngineInterface): Promise<PaneState> {
  const s = await read($, PANE)
  if (s.mode !== 'idle') return s
  const m = await mirrored($)
  if (!m) return s
  await put($, () => m)
  return m
}

/** Pick `i` on asked row `row`: stays asking while questions remain, else settles to review and reopens without closeOnEscape (Esc in review only returns the keys). */
async function advancePick($: EngineInterface, s: PaneState, row: number, i: number): Promise<Plan> {
  const picked = applyPick(s.plan!, row, i, 'user')
  if (cursor(picked) !== undefined) {
    await put($, () => withImages({ mode: 'asking', plan: picked }, s))
    return picked
  }
  stopAnimation()
  await put($, () => withImages({ mode: 'review', plan: settle(picked) }, s))
  await $.ui.open(REVIEW_OPEN)
  return picked
}

async function onPick($: EngineInterface, i: number): Promise<void> {
  if (picking) return
  picking = true
  try {
    const s = await read($, PANE)
    if (!s.plan) return
    if (s.mode === 'asking') {
      const row = cursor(s.plan)
      if (row !== undefined) await advancePick($, s, row, i)
      return
    }
    if (s.mode === 'swapping' && s.plan.swapping !== undefined) {
      const row = s.plan.swapping
      const term = s.plan.decisions[row]?.term
      const id = term === undefined ? undefined : [term, ...(TERMS[term]?.alt ?? [])][i]
      if (id === undefined) return
      const plan = drop(swapRow(s.plan, row, id), 'swapping')
      await put($, () => withImages({ mode: after(plan), plan }, s))
    }
  } finally {
    picking = false
  }
}

/** Keep: leaves swapping without changing the row. */
function onSwapCancel($: EngineInterface): Promise<void> {
  return move($, ['swapping'], after, p => drop(p, 'swapping'))
}

async function onExpand($: EngineInterface, i: number): Promise<void> {
  let key: string | undefined
  await edit($, ['review', 'building', 'done'], p => {
    if (p.expanded === i) return drop(p, 'expanded')
    const d = p.decisions[i]
    key = d ? TERMS[d.term]?.params[0]?.key : undefined
    return { ...p, expanded: i }
  })
  const s = await read($, PANE)
  if (key && s.mode !== 'building' && s.plan?.expanded === i) {
    // `{ deny }` (a site that does not hold the keys) and a host without the call are of no consequence.
    await $.ui.focus({ requestId: 'ui-picker', key: `p-${i}-${key}` }).then(() => undefined, () => undefined)
  }
}

/** A pick leaves the Select, back to the row's Button: the next Enter closes the row and the digit hotkeys work again. */
async function onSelect($: EngineInterface, i: number, key: string, raw: string): Promise<void> {
  await edit($, ['review', 'done'], p => {
    const d = p.decisions[i]
    const spec = d ? TERMS[d.term]?.params.find(s => s.key === key) : undefined
    return spec ? setParam(p, i, key, parseValue(spec, raw)) : p
  })
  await $.ui.focus({ requestId: 'ui-picker', key: `row-${i}` }).then(() => undefined, () => undefined)
}

function onNote($: EngineInterface, i: number, text: string): Promise<void> {
  return edit($, ['review', 'done'], p => setNote(p, i, text))
}

/** A row must be open to swap; without one the mode stays. */
function onSwap($: EngineInterface): Promise<void> {
  return move($, ['review', 'done'], p => (p.swapping === undefined ? after(p) : 'swapping'), p => (p.expanded === undefined ? p : { ...p, swapping: p.expanded }))
}

function onReset($: EngineInterface): Promise<void> {
  return edit($, ['review', 'done'], p => (p.expanded === undefined ? p : resetRow(p, p.expanded)))
}

async function onConfirm($: EngineInterface): Promise<void> {
  const s = await read($, PANE)
  if (s.mode === 'review') await confirm($)
  else if (s.mode === 'done') await sendChanges($)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    if (e.surface !== 'terminal' || !e.isInteractive) {
      $.ui.log(DISABLED_LINE)
      return next(e)
    }
    enabled = true
    await $.tool.register({ name: 'ui_pick', description: PICK_DESCRIPTION, inputSchema: UI_PICK_SCHEMA, isDeferred: false })
    await $.command.register({ name: 'ui-picker', description: 'Open the ui-picker pane (pending question or plan)' })
    return next(e)
  })

  on('prompt.compose', async ($, e, next) => {
    const r = await next(e)
    if (!enabled || !e.tools.includes(PICK_TOOL)) return r
    return { sections: [...r.sections, RULES] }
  })

  on('prompt.submit', async ($, e, next) => {
    if (!enabled || e.command || e.isMeta || e.origin.kind === 'plugin') return next(e)
    const context = [...(e.context ?? [])]
    let confirmed = false
    if (e.origin.kind === 'composer' || e.origin.kind === 'bridge') {
      const s = await recover($)
      if (s.plan && isPending(s.mode)) {
        const p = s.plan
        const m = BARE_DIGIT.exec(e.text)
        if (m) {
          const k = m[1]!
          if (s.mode !== 'asking') return { drop: t(p, 'typedInReview') }
          const row = cursor(p)
          const n = row === undefined ? 0 : (p.decisions[row]?.options?.length ?? 0)
          if (row === undefined || Number(k) > n) return { drop: t(p, 'typedNoOption', { k, n }) }
          const picked = await advancePick($, s, row, Number(k) - 1)
          return cursor(picked) !== undefined
            ? { drop: t(p, 'typedPick', { k, i: answered(picked) + 1, n: questions(picked) }) }
            : { drop: t(p, 'typedLast', { k }) }
        }
        // Any other prompt travels with the pending plan: the model answers a question and leaves it, or re-plans with ui_pick
        // (accepted once the person has spoken: `prompted`). Nothing is confirmed by typing; Enter in the pane builds.
        await edit($, PENDING, q => ({ ...q, prompted: true }))
        context.push(pendingContext(p))
        confirmed = true
      }
    }
    // The pending block already tells the model what to do; UI_CONTEXT would ask for a fresh plan.
    if (!confirmed && UI_KEYWORDS.test(e.text) && !META.test(e.text)) context.push(UI_CONTEXT)
    return next(context.length === (e.context?.length ?? 0) ? e : { ...e, context })
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'ui-picker' }, async $ => {
    if (!enabled) return { text: DISABLED_LINE }
    const s = await recover($)
    await $.ui.open(openOf(s.mode))
    // A pane re-shown from behind another tab gets no fresh ui.render; re-arm the loop here (idempotent).
    if (s.plan && targets.length > 0) animate($)
    if (s.mode === 'asking' || s.mode === 'swapping') return { text: 'ui-picker: pending question opened.' }
    if (s.mode === 'review') return { text: 'ui-picker: plan opened for review.' }
    if (s.plan) return { text: 'ui-picker: plan opened.' }
    return { text: IDLE_LINE }
  })

  on('tool.call', { tool: PICK_TOOL }, async ($, e) => {
    if (!enabled) return { deny: DISABLED_LINE }
    const cur = await recover($)
    if (busy(cur)) return { deny: stillPending(cur.mode, answered(cur.plan!), questions(cur.plan!)) }
    const v = validatePick(argsOf(e))
    if (!v.ok) return { deny: v.deny }
    const n = questions(v.value)
    const mode: Mode = n > 0 ? 'asking' : 'review'
    const plan = n > 0 ? v.value : settle(v.value)
    const opened = await $.ui.open(openOf(mode))
    if (!opened.isPlaced) return { deny: notPlaced(opened.reason) }
    // update() reads, applies and writes with ifVersion, so of two calls in flight only one takes the pane.
    const found: { busy?: PaneState } = {}
    await put($, s => {
      if (busy(s)) {
        found.busy = s
        return s
      }
      return withImages({ mode, plan }, s)
    })
    if (found.busy?.plan) return { deny: stillPending(found.busy.mode, answered(found.busy.plan), questions(found.busy.plan)) }
    stopAnimation()
    animate($)
    // A registered tool's result must be a string or content blocks (engine output shape); the model reads the JSON.
    return { result: JSON.stringify({ review: true, questions: n }) }
  })

  on('ui.render', { component: 'Pane', requestId: 'ui-picker' }, async ($, e) => {
    if (e.surface !== 'terminal') {
      const { Text } = $.ui.resolve(e)
      return <Text>{t({ lang: 'en' }, 'terminalOnly')}</Text>
    }
    const s = await read($, PANE)
    const images = s.images !== false
    const ask: Ask | undefined = s.plan && (s.mode === 'asking' || s.mode === 'swapping') ? askOf(s.plan, s.mode) : undefined
    if (ask) {
      targets = previewTargets(ask, e, images)
      // Idempotent: re-arms the loop after a 15-miss stop, a hot reload or a worker respawn, whenever a picker pane is drawn.
      animate($)
      return pickerTree($, e, ask, images, {
        pick: i => void onPick($, i),
        cancel: () => void onSwapCancel($),
      })
    }
    if (s.plan && (s.mode === 'review' || s.mode === 'building' || s.mode === 'done')) {
      targets = reviewTargets(s.plan, e, images)
      if (targets.length > 0) animate($)
      else stopAnimation()
      return reviewTree($, e, s.mode, s.plan, images, {
        expand: i => void onExpand($, i),
        select: (i, key, raw) => void onSelect($, i, key, raw),
        note: (i, text) => void onNote($, i, text),
        swap: () => void onSwap($),
        reset: () => void onReset($),
        confirm: () => void onConfirm($),
      })
    }
    targets = []
    stopAnimation()
    const { Text } = $.ui.resolve(e)
    return <Text dimColor>{t({ lang: 'en' }, 'noContent')}</Text>
  })

  on('ui.close', { id: 'ui-picker' }, async ($, e, next) => {
    if (!enabled || e.origin.kind !== 'person') return next(e)
    const s = await read($, PANE)
    if (s.mode !== 'asking' || !s.plan) return next(e)
    // Esc while asking: the rest take their recommended option and the plan goes to review; the pane stays.
    stopAnimation()
    const plan = settle(resolveRemaining(s.plan))
    await put($, () => withImages({ mode: 'review', plan }, s))
    // After this close settles: a fresh open clears the ask open's closeOnEscape and gives review the keys.
    $.clock.after(0, () => void $.ui.open(REVIEW_OPEN))
    return { value: undefined }
  }).catch(($, e, next) => (next.called ? next(e) : { value: undefined }))

  // The build turn is the first main-loop turn that starts while building; only its completion marks done (the ui_pick turn may still be running when Enter is pressed).
  on('turn.start', async ($, e, next) => {
    if (enabled && e.agentId === undefined)
      await put($, s => (s.mode === 'building' && s.plan && s.plan.turn === undefined ? { ...s, plan: { ...s.plan, turn: e.turnId } } : s))
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    if (enabled && !e.agentId)
      await put($, s => (s.mode === 'building' && s.plan && s.plan.turn === e.turnId ? { ...s, mode: 'done' as const, plan: drop(s.plan, 'turn') } : s))
    return next(e)
  }).catch(($, e, next) => next(e))

  // /clear: the model forgets the conversation, so a pending plan would block every later ui_pick. Start over.
  on('session.end', async ($, e, next) => {
    if (enabled && e.reason === 'clear') {
      stopAnimation()
      await put($, () => IDLE)
      await $.ui.close({ id: 'ui-picker' }).catch(() => undefined)
    }
    return next(e)
  }).catch(($, e, next) => next(e))
}
