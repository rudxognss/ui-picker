/** BCP-47-ish code of the person's language. Built-in dictionaries: 'en', 'ko'; any other code reads `Plan.labels`, then English. */
export type Lang = string
/** Model-supplied text for a language without a built-in dictionary: pane strings by key, term texts by id. Missing entries fall back to English. */
export type TermLabels = { name?: string; when?: string; caption?: string; params?: Record<string, string> }
export type Labels = { ui?: Record<string, string>; terms?: Record<string, TermLabels> }
/** Anything that carries a language: a Plan, or the picker's Ask. */
export type L = { lang: Lang; labels?: Labels }
export type Mode = 'idle' | 'asking' | 'review' | 'swapping' | 'building' | 'done'
/** Origin of a row's term; never changes after settle. */
export type Source = 'model' | 'user' | 'recommended'
export type Decision = {
  area: string
  term: string
  params: Record<string, string | number>
  source: Source
  /** Asked row: candidate ids, [0] recommended. */
  options?: string[]
  /** Asked row answered or resolved. */
  picked?: true
  /** The person's free text, <= 200 chars. */
  note?: string
}
export type Plan = {
  title?: string
  lang: Lang
  labels?: Labels
  decisions: Decision[]
  /** Snapshot after settle: reset and the `changed` tag read it. */
  original: Decision[]
  /** What the last build/change message carried. */
  sent?: Decision[]
  /** building: the id of the turn that builds from this plan (stamped by its turn.start). */
  turn?: string
  /** pending: the person typed a prompt over this plan; the next ui_pick replaces it instead of being denied as a re-ask. */
  prompted?: true
  /** review: open row. */
  expanded?: number
  /** swapping: row being swapped. */
  swapping?: number
}
/** `images`: false once this terminal refused to draw an Image (kitty graphics absent); previews fall back to Raster cell art. */
export type PaneState = { mode: Mode; plan?: Plan; images?: boolean }

declare module 'claude-code' {
  interface PluginState {
    'ui-picker': { pane: PaneState }
  }
}
