import { test, expect } from 'claude-code/testing'
import { UI_PICK_SCHEMA, validatePick } from '../hooks/schema'
import { inferLang } from '../hooks/state'
import { BAKERY, call, ui } from './kit'

const denyOf = (input: unknown): string | undefined => {
  const r = validatePick(input)
  return r.ok ? undefined : r.deny
}
const ok = (input: unknown) => {
  const r = validatePick(input)
  if (!r.ok) throw new Error(r.deny)
  return r.value
}
const strip = ({ tool, ...rest }: Record<string, unknown>) => rest

test('schema: ui is the only required field; ui and params take any area names', async () => {
  expect(UI_PICK_SCHEMA.required).toEqual(['ui'])
  const props = UI_PICK_SCHEMA.properties as Record<string, Record<string, unknown>>
  expect(props.ui!.additionalProperties).toBe(true)
  expect(props.ui!.minProperties).toBe(1)
  expect(props.ui!.maxProperties).toBe(9)
  expect(props.params!.additionalProperties).toBe(true)
  expect(props.title!.maxLength).toBe(40)
})

test('validatePick: the bakery call becomes 4 decisions in page order, one asked, lang inferred ko', async () => {
  const p = ok(strip(BAKERY))
  expect(p.lang).toBe('ko')
  expect(p.title).toBe('빵집 사이트')
  expect(p.decisions.map(d => d.area)).toEqual(['상단 내비게이션', '상단 영역', '빵 메뉴', '메뉴 카드'])
  expect(p.decisions[0]).toEqual({ area: '상단 내비게이션', term: 'sticky-header', params: { height: 64, shadow: 'on', mobile: 'logo+menu' }, source: 'model' })
  expect(p.decisions[2]).toEqual({
    area: '빵 메뉴',
    term: 'card-layout',
    params: { cols: 3, md: 2, sm: 1, gap: 24 },
    source: 'model',
    options: ['card-layout', 'bento-grid', 'carousel'],
  })
  expect(p.decisions[2]!.picked).toBeUndefined()
  expect(p.original).toEqual([])
})

test('validatePick: params override defaults on decided areas and keep the typed value', async () => {
  const p = ok(strip(call({ params: { nav: { height: '72', shadow: 'off' } } }, ui('nav', 'sticky-header'))))
  expect(p.decisions[0]!.params).toEqual({ height: 72, shadow: 'off', mobile: 'logo+menu' })
  expect(p.lang).toBe('en')
})

test('validatePick: deny strings', async () => {
  expect(denyOf({ lang: 'French', ui: { a: 'drawer' } })).toBe('lang: expected a language code like en, ko, ja, zh-TW')
  expect(denyOf({})).toBe('ui: expected 1 to 9 areas, got 0')
  expect(denyOf({ ui: Object.fromEntries([...'abcdefghij'].map(k => [k, 'drawer'])) })).toBe('ui: expected 1 to 9 areas, got 10')
  expect(denyOf({ ui: { ['x'.repeat(41)]: 'drawer' } })).toBe(`ui.${'x'.repeat(41)}: area too long`)
  expect(denyOf({ ui: { '12': 'drawer' } })).toBe('ui.12: integer-like area names are not allowed')
  expect(denyOf({ ui: { nav: 'navbar' } })).toBe('ui.nav: unknown id "navbar"')
  expect(denyOf({ ui: { nav: ['drawer'] } })).toBe('ui.nav: expected 2 to 4 candidates, got 1')
  expect(denyOf({ ui: { nav: ['drawer', 'modal', 'tabs', 'toast', 'tooltip'] } })).toBe('ui.nav: expected 2 to 4 candidates, got 5')
  expect(denyOf({ ui: { nav: ['drawer', 'nope'] } })).toBe('ui.nav: unknown id "nope"')
  expect(denyOf({ ui: { nav: ['drawer', 'drawer'] } })).toBe('ui.nav: duplicate id "drawer"')
  expect(denyOf({ ui: { a: ['drawer', 'modal'], b: ['tabs', 'accordion'], c: ['toast', 'tooltip'], d: ['stagger', 'parallax'] } })).toBe('ui: more than 3 questions')
  expect(denyOf({ ui: { a: ['drawer', 'modal'] }, params: { a: { side: 'left' } } })).toBe('params.a: not a decided area')
  expect(denyOf({ ui: { a: 'drawer' }, params: { b: { side: 'left' } } })).toBe('params.b: not a decided area')
  expect(denyOf({ ui: { a: 'drawer' }, params: { a: { color: 'red' } } })).toBe('params.a.color: unknown key')
  expect(denyOf({ ui: { a: 'drawer' }, params: { a: { side: 'top' } } })).toBe('params.a.side: expected one of right, left')
})

test('inferLang: Hangul in the title or any area reads ko, else en; lang given wins', async () => {
  expect(inferLang(undefined, ['nav', 'hero'])).toBe('en')
  expect(inferLang('빵집', ['nav'])).toBe('ko')
  expect(inferLang(undefined, ['nav', '메뉴'])).toBe('ko')
  expect(ok({ lang: 'en', ui: { 메뉴: 'drawer' } }).lang).toBe('en')
  expect(ok({ ui: { 메뉴: 'drawer' } }).lang).toBe('ko')
})
