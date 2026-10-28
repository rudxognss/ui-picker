import type { Mode } from '../types'

export const PROMPT_SECTION_ID = 'ui-picker:rules'

export const PROMPT_SECTION = [
  'ui-picker: on a request that builds or changes UI, apply the ui-vocab skill: list every UI area in page order as area -> term id; decide conventional ones yourself; where 2-4 ids fit and the choice changes structure, list the candidates, recommended first (max 3 such areas).',
  'Call mcp__ui-picker__ui_pick once: {title?, lang, ui, params?, labels?}. lang = the person\'s language code. labels only when lang is not en or ko: pane strings and every used id\'s name/when/caption/params in that language (see the skill). params only for numbers the request fixes. Then end the turn with one line meaning "Check the right pane." in the person\'s language (ko: 오른쪽 패널을 확인하세요.). Do not build in that turn.',
  'Build only in the turn that receives a user message starting "ui-picker: build". Each line is final: never swap its term; listed params override the card defaults, unlisted ones keep them; a quoted note is the person\'s instruction. A later "ui-picker: change" message lists only the rows to redo. Never call ui_pick again for the same request unless denied with a field line (ui..., params..., lang...): fix once and retry.',
  'A prompt typed while a plan waits in the pane arrives with a context block starting "ui-picker: a plan is pending": a question gets an answer and the plan stays; a change or go-ahead gets one new ui_pick with the whole amended plan (picked rows as decided ids), then "Check the right pane." again. Never build from that block.',
].join('\n')

// Generic nouns (form, table, list, 폼, 테이블, 목록) are left out: they name no term card and match database, CLI and refactoring prompts.
// Residual hits of spec-listed words ("settings file", "man page", src/ui/) are accepted.
// Product nouns (app, website, kiosk) are included: a request to build one always carries UI decisions.
export const UI_KEYWORDS =
  /\b(page|screen|button|menu|settings?|cards?|layout|landing|dashboard|modal|drawer|navbar|sidebar|hero|ui|ux|app|website|site|kiosk|frontend|front-end)\b|화면|페이지|버튼|메뉴|설정|카드|레이아웃|랜딩|대시보드|모달|드로어|사이드바|히어로|앱|웹사이트|사이트|키오스크|프론트/i

/** A prompt that talks about this mod or quotes its wire (a tool call echo, a result) is not a UI request. */
export const META = /ui[-_ ]?picker|ui_pick|ui_board|ui-vocab|mcp__|"(shown|review|asked)":/i

/** Closes the pending-plan context block: what the model does with a prompt typed over a plan it has not been handed yet. */
export const PENDING_TAIL =
  'If this prompt is a question or unrelated, answer it and leave the plan in the pane. If it changes or approves this UI plan, call ui_pick once more with the whole amended plan (the rows above as decided ids) and end the turn with "Check the right pane."; the person confirms there with Enter. Do not build from this block.'

export const UI_CONTEXT = 'ui-picker: UI request. Apply ui-vocab: call ui_pick once (areas -> ids), then end the turn with "Check the right pane."'

export const DISABLED_LINE = 'ui-picker: requires the Claude Code terminal CLI. Disabled for this session.'

export const IDLE_LINE = 'ui-picker: pane open. Repeat your UI request; the plan appears here.'

export function notPlaced(reason: string): string {
  return 'ui-picker: pane not placed (' + reason + '). Widen the terminal to ≥144 columns, or run /ui-picker and leave the pane open, then repeat your request.'
}

export function stillPending(mode: Mode, k: number, n: number): string {
  return mode === 'asking'
    ? `ui-picker: a question set is still pending (${k}/${n} answered). Do not ask again and do not build; wait for the "ui-picker: build" message.`
    : 'ui-picker: the plan is under review in the pane. Do not build; wait for the "ui-picker: build" message.'
}

/** Asking takes the keyboard and dialog manners: hotkeys need the keys, Esc applies the recommended options and moves on to review. */
export const ASK_OPEN = { id: 'ui-picker', title: 'ui-picker', focus: true, closeOnEscape: true, rows: 30, columns: 86 } as const

/** Review takes the keys (Enter builds) but not closeOnEscape: Esc only returns the keys. Each open sets both anew, so this also clears an ask open's closeOnEscape. */
export const REVIEW_OPEN = { id: 'ui-picker', title: 'ui-picker', focus: true, rows: 30, columns: 86 } as const

/** Building, done and idle have nothing to press by default: no focus. */
export const SHOW_OPEN = { id: 'ui-picker', title: 'ui-picker', rows: 24, columns: 86 } as const
