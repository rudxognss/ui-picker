import { test, expect } from 'claude-code/testing'
import { validatePick } from '../hooks/schema'
import { t } from '../hooks/strings'
import { chipsOf, nameOf, textOf } from '../hooks/terms'
import { buildMessage } from '../hooks/format'
import { settle } from '../hooks/state'

const ok = (input: unknown) => {
  const r = validatePick(input)
  if (!r.ok) throw new Error(r.deny)
  return r.value
}
const denyOf = (input: unknown): string | undefined => {
  const r = validatePick(input)
  return r.ok ? undefined : r.deny
}
const JA = {
  title: 'パン屋のサイト',
  lang: 'ja',
  ui: { 'ナビ': 'sticky-header', 'メニュー': ['card-layout', 'bento-grid'] },
  labels: {
    ui: { progress: '質問 {i}/{n}', build: 'ビルド', sourceUser: 'あなたの選択' },
    terms: {
      'card-layout': { name: 'カードレイアウト', when: '同じ種類の項目が多いとき', caption: '同じ大きさのカードが格子に並ぶ', params: { cols: '列' } },
      'sticky-header': { name: 'スティッキーヘッダー' },
    },
  },
}

test('i18n: any language code is accepted; labels are kept on the plan', async () => {
  const p = ok(JA)
  expect(p.lang).toBe('ja')
  expect(p.labels?.terms?.['card-layout']?.name).toBe('カードレイアウト')
  expect(ok({ lang: 'zh-TW', ui: { 导航: 'sticky-header' } }).lang).toBe('zh-TW')
  expect(denyOf({ lang: 'Japanese', ui: { a: 'tabs' } })).toBe('lang: expected a language code like en, ko, ja, zh-TW')
})

test('i18n: lookups read labels first, then the built-in column, then English', async () => {
  const p = ok(JA)
  expect(nameOf('card-layout', p)).toBe('カードレイアウト')
  expect(nameOf('bento-grid', p)).toBe('Bento Grid')
  expect(textOf('card-layout', 'when', p)).toBe('同じ種類の項目が多いとき')
  expect(textOf('bento-grid', 'when', p)).toBe('A feature or highlights section with unequal items.')
  expect(chipsOf('card-layout', { cols: 4 }, p)[0]).toBe('列 4')
  expect(chipsOf('card-layout', { cols: 4 }, p)[1]).toBe('at 1024px 2')
  expect(t(p, 'progress', { i: 1, n: 1 })).toBe('質問 1/1')
  expect(t(p, 'pickPrompt')).toBe('Pick a pattern for this area')
  expect(nameOf('card-layout', { lang: 'ko' })).toBe('카드 레이아웃')
  expect(nameOf('card-layout', { lang: 'de' })).toBe('Card Layout')
})

test('i18n: the build message keeps English term names and uses the labelled tag', async () => {
  const p = settle(ok(JA))
  p.decisions[1]!.source = 'user'
  expect(buildMessage(p)).toBe('ui-picker: build\n- ナビ: Sticky Header\n- メニュー: Card Layout (あなたの選択)')
})

test('i18n: bad labels deny with a field line', async () => {
  const base = { lang: 'ja', ui: { a: 'tabs' } }
  expect(denyOf({ ...base, labels: 'x' })).toBe('labels: expected an object')
  expect(denyOf({ ...base, labels: { ui: { nope: 'x' } } })).toBe('labels.ui.nope: unknown key')
  expect(denyOf({ ...base, labels: { terms: { ghost: {} } } })).toBe('labels.terms.ghost: unknown id')
  expect(denyOf({ ...base, labels: { terms: { tabs: { params: { zzz: 'x' } } } } })).toBe('labels.terms.tabs.params.zzz: unknown key')
  expect(denyOf({ ...base, labels: { terms: { tabs: { name: 'x'.repeat(161) } } } })).toBe('labels.terms.tabs.name: expected a string of at most 160 chars')
})
