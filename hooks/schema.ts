import type { Decision, Labels, Lang, Plan, TermLabels } from '../types'
import { inferLang } from './state'
import { STRING_KEYS } from './strings'
import { defaultsOf, TERMS } from './terms'

export { inferLang }

export type Ok<T> = { ok: true; value: T }
export type Deny = { ok: false; deny: string }

export const UI_PICK_SCHEMA: Record<string, unknown> = {
  type: 'object',
  required: ['ui'],
  properties: {
    title: { type: 'string', maxLength: 40 },
    lang: { type: 'string', pattern: '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$', description: "The person's language (BCP-47: en, ko, ja, zh-TW, de...). Omitted: ko when title/areas contain Hangul, else en." },
    labels: {
      type: 'object',
      additionalProperties: true,
      description: 'Only when lang is not en or ko: {ui: {key: text}, terms: {id: {name, when, caption, params: {key: text}}}} in that language for every id in ui. Missing texts show in English.',
    },
    ui: {
      type: 'object',
      minProperties: 1,
      maxProperties: 9,
      additionalProperties: true,
      description: 'area -> id (decided) or area -> [2-4 ids] (ask, recommended first). Insertion order = page order. Max 3 arrays.',
    },
    params: {
      type: 'object',
      additionalProperties: true,
      description: 'area -> {key: value} for numbers the request fixes (keys per term card params). Decided areas only. Else omit.',
    },
  },
}

type Rec = Record<string, unknown>
const rec = (v: unknown): Rec | undefined => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Rec) : undefined)
const deny = (deny: string): Deny => ({ ok: false, deny })
const MAX_AREA = 40
const MAX_QUESTIONS = 3
const MAX_LABEL = 160
const LANG = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/

const str = (path: string, v: unknown): Ok<string> | Deny =>
  typeof v === 'string' && v.length <= MAX_LABEL ? { ok: true, value: v } : deny(`${path}: expected a string of at most ${MAX_LABEL} chars`)

/** Pane text in the person's language: known string keys, known ids, known param keys; anything else is a field deny. */
export function validateLabels(input: unknown): Ok<Labels> | Deny {
  const o = rec(input)
  if (!o) return deny('labels: expected an object')
  const out: Labels = {}
  if (o.ui !== undefined) {
    const ui = rec(o.ui)
    if (!ui) return deny('labels.ui: expected an object')
    out.ui = {}
    for (const k of Object.keys(ui)) {
      if (!STRING_KEYS.includes(k)) return deny(`labels.ui.${k}: unknown key`)
      const r = str(`labels.ui.${k}`, ui[k])
      if (!r.ok) return r
      out.ui[k] = r.value
    }
  }
  if (o.terms !== undefined) {
    const terms = rec(o.terms)
    if (!terms) return deny('labels.terms: expected an object')
    out.terms = {}
    for (const id of Object.keys(terms)) {
      const term = TERMS[id]
      if (!term) return deny(`labels.terms.${id}: unknown id`)
      const given = rec(terms[id])
      if (!given) return deny(`labels.terms.${id}: expected an object`)
      const tl: TermLabels = {}
      for (const f of ['name', 'when', 'caption'] as const) {
        if (given[f] === undefined) continue
        const r = str(`labels.terms.${id}.${f}`, given[f])
        if (!r.ok) return r
        tl[f] = r.value
      }
      if (given.params !== undefined) {
        const ps = rec(given.params)
        if (!ps) return deny(`labels.terms.${id}.params: expected an object`)
        tl.params = {}
        for (const key of Object.keys(ps)) {
          if (!term.params.some(s => s.key === key)) return deny(`labels.terms.${id}.params.${key}: unknown key`)
          const r = str(`labels.terms.${id}.params.${key}`, ps[key])
          if (!r.ok) return r
          tl.params[key] = r.value
        }
      }
      out.terms[id] = tl
    }
  }
  return { ok: true, value: out }
}

export function validatePick(input: unknown): Ok<Plan> | Deny {
  const o = rec(input) ?? {}
  if (o.lang !== undefined && (typeof o.lang !== 'string' || !LANG.test(o.lang))) return deny('lang: expected a language code like en, ko, ja, zh-TW')
  const ui = rec(o.ui) ?? {}
  const areas = Object.keys(ui)
  if (areas.length < 1 || areas.length > 9) return deny(`ui: expected 1 to 9 areas, got ${areas.length}`)
  const decisions: Decision[] = []
  let asked = 0
  for (const area of areas) {
    if (area.length > MAX_AREA) return deny(`ui.${area}: area too long`)
    if (/^\d+$/.test(area)) return deny(`ui.${area}: integer-like area names are not allowed`)
    const v = ui[area]
    if (Array.isArray(v)) {
      if (v.length < 2 || v.length > 4) return deny(`ui.${area}: expected 2 to 4 candidates, got ${v.length}`)
      const ids: string[] = []
      for (const id of v) {
        if (typeof id !== 'string' || !Object.hasOwn(TERMS, id)) return deny(`ui.${area}: unknown id "${String(id)}"`)
        if (ids.includes(id)) return deny(`ui.${area}: duplicate id "${id}"`)
        ids.push(id)
      }
      asked++
      decisions.push({ area, term: ids[0]!, params: defaultsOf(ids[0]!), source: 'model', options: ids })
    } else {
      if (typeof v !== 'string' || !Object.hasOwn(TERMS, v)) return deny(`ui.${area}: unknown id "${String(v)}"`)
      decisions.push({ area, term: v, params: defaultsOf(v), source: 'model' })
    }
  }
  if (asked > MAX_QUESTIONS) return deny('ui: more than 3 questions')
  const params = rec(o.params) ?? {}
  for (const area of Object.keys(params)) {
    const d = decisions.find(x => x.area === area)
    if (!d || d.options) return deny(`params.${area}: not a decided area`)
    const given = rec(params[area]) ?? {}
    for (const key of Object.keys(given)) {
      const spec = TERMS[d.term]!.params.find(s => s.key === key)
      if (!spec) return deny(`params.${area}.${key}: unknown key`)
      const match = spec.values.find(x => String(x) === String(given[key]))
      if (match === undefined) return deny(`params.${area}.${key}: expected one of ${spec.values.join(', ')}`)
      d.params[key] = match
    }
  }
  const title = typeof o.title === 'string' ? o.title : undefined
  const lang: Lang = typeof o.lang === 'string' ? o.lang : inferLang(title, areas)
  const plan: Plan = { lang, decisions, original: [] }
  if (title !== undefined) plan.title = title
  if (o.labels !== undefined) {
    const r = validateLabels(o.labels)
    if (!r.ok) return r
    plan.labels = r.value
  }
  return { ok: true, value: plan }
}
