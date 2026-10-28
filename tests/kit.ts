import type { On, RenderPropsOf, SessionStartInput, TurnCompleteInput, UiOpenResult } from 'claude-code'
import type { MockClock, MountTarget } from 'claude-code/testing'
import { mock } from 'claude-code/testing'

export type Recorded = {
  submitted: string[]
  contexts: (readonly string[] | undefined)[]
  logged: string[]
  registered: string[]
  opens: { id: string; focus?: true; closeOnEscape?: true }[]
  closed: { id: string; origin: string }[]
  blits: string[]
  toasts: string[]
  filled: string[]
  store: Record<string, unknown>
  clock: MockClock
}

export type Bottoms = {
  placed?: boolean
  reason?: string
  /** Read at every blit: true answers `{ deny }`. */
  denyBlits?: () => boolean
  /** The deny text a denied blit carries; default `not mounted`. */
  blitDeny?: string
  /** When set, a plugin-origin prompt.submit answers `{ drop }`. */
  drop?: string
  /** What `$.session.id()` answers; default `sess-1`. */
  sessionId?: string
}

export function bottoms(on: On, opts: Bottoms = {}): Recorded {
  const opened: UiOpenResult =
    opts.placed === false ? { isPlaced: false, reason: opts.reason ?? 'below 144 columns' } : { isPlaced: true }
  const r: Recorded = {
    submitted: [],
    contexts: [],
    logged: [],
    registered: [],
    opens: [],
    closed: [],
    blits: [],
    toasts: [],
    filled: [],
    store: {},
    clock: mock.clock(on),
  }
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('session.id', () => ({ value: opts.sessionId ?? 'sess-1' }))
  on('session.end', ($, e) => ({ sessionId: e.sessionId }))
  on('store.get', ($, e) => ({ value: r.store[e.key] }))
  on('store.set', ($, e) => {
    r.store[e.key] = e.value
    return { value: undefined }
  })
  on('store.delete', ($, e) => {
    delete r.store[e.key]
    return { value: undefined }
  })
  on('tool.register', ($, e) => {
    r.registered.push(e.name)
    return { value: { tool: 'mcp__ui-picker__' + e.name } }
  })
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('ui.log', ($, e) => {
    r.logged.push(e.text)
    return { value: undefined }
  })
  on('ui.toast', ($, e) => {
    r.toasts.push(e.text)
    return { value: undefined }
  })
  on('ui.open', { id: 'ui-picker' }, ($, e) => {
    r.opens.push({ id: e.id, focus: e.focus, closeOnEscape: e.closeOnEscape })
    return { value: opened }
  })
  on('ui.close', ($, e) => {
    r.closed.push({ id: e.id, origin: e.origin.kind })
    return { value: undefined }
  })
  on('ui.blit', ($, e) => {
    r.blits.push(e.key)
    return { value: opts.denyBlits?.() ? { deny: opts.blitDeny ?? 'not mounted' } : {} }
  })
  on('prompt.fill', ($, e) => {
    r.filled.push(e.text)
    return { isFilled: true }
  })
  on('prompt.submit', ($, e) => {
    r.submitted.push(e.text)
    r.contexts.push(e.context)
    if (opts.drop !== undefined && e.origin.kind === 'plugin') return { drop: opts.drop }
    return { text: e.text, context: e.context, origin: e.origin }
  })
  on('prompt.compose', () => ({ sections: [] }))
  on('turn.start', ($, e) => ({ turnId: e.turnId }))
  on('turn.complete', ($, e) => ({ text: e.answer }))
  return r
}

export const PANE: RenderPropsOf['Pane'] = {
  title: 'ui-picker',
  isFocused: true,
  bodyColumns: 60,
  placement: 'dock',
  scroll: { offset: 0, bodyRows: 36 },
  view: {},
}

export const MOUNT: MountTarget<'terminal', 'Pane'> = {
  plugin: 'ui-picker',
  surface: 'terminal',
  component: 'Pane',
  requestId: 'ui-picker',
  viewport: { columns: 160, rows: 40 },
  props: PANE,
}

export const SESSION: SessionStartInput = { cwd: '/tmp/p', surface: 'terminal', isInteractive: true }

export const PICK = 'mcp__ui-picker__ui_pick' as const
export const RUN = { command: 'ui-picker', args: '', origin: { kind: 'composer' as const }, presentation: { isFullscreen: true, columns: 160 } }

/** One `ui` entry: a decided area (`ui('nav', 'sticky-header')`) or an asked one (`ui('빵 메뉴', ['card-layout', 'bento-grid', 'carousel'])`). */
export const ui = (area: string, v: string | string[]): Record<string, string | string[]> => ({ [area]: v })

export type PickCall = { tool: typeof PICK; title?: string; lang?: string; ui: Record<string, string | string[]>; params?: Record<string, Record<string, unknown>> }

/** A `ui_pick` tool call over the given areas, in order. */
export function call(extra: Omit<PickCall, 'tool' | 'ui'>, ...areas: Record<string, string | string[]>[]): PickCall {
  return { tool: PICK, ...extra, ui: Object.assign({}, ...areas) as Record<string, string | string[]> }
}

/** The spec's bakery request: three decided areas and one question (191 bytes on the wire). */
export const BAKERY = call(
  { title: '빵집 사이트' },
  ui('상단 내비게이션', 'sticky-header'),
  ui('상단 영역', 'hero-section'),
  ui('빵 메뉴', ['card-layout', 'bento-grid', 'carousel']),
  ui('메뉴 카드', 'hover-effect'),
)

/** Two questions, English; every candidate has a PNG preview (Raster cell art once a blit is refused). */
export const TWO = call({ lang: 'en' }, ui('settings', ['drawer', 'modal', 'bottom-sheet']), ui('features', ['bento-grid', 'card-layout']))

export const TURN: TurnCompleteInput = { answer: 'Built it.', durationMs: 1200, isAborted: false, turnId: 't1', reason: 'answer' }

export const composer = (text: string) => ({ text, wait: false as const, origin: { kind: 'composer' as const } })
