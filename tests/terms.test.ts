import { test, expect } from 'claude-code/testing'
import { TERMS, TERM_IDS, nameOf, defaultsOf, chipsOf, parseValue } from '../hooks/terms'
import { hasPreview } from '../hooks/previews/index'

const ORDER = [
  'hero-section', 'responsive-layout', 'card-layout', 'bento-grid', 'sidebar-layout', 'sticky-header', 'split-layout',
  'tabs', 'accordion', 'modal', 'drawer', 'bottom-sheet', 'dropdown', 'tooltip', 'toast', 'carousel', 'skeleton',
  'hover-effect', 'scroll-reveal', 'stagger', 'smooth-transition', 'glassmorphism', 'parallax', 'scroll-snap', 'micro-interaction',
]

test('25 ids in terms.md order', async () => {
  expect(TERM_IDS.length).toBe(25)
  expect([...TERM_IDS]).toEqual(ORDER)
})

test('every param: def in values, <= 12 values, unique keys, labels <= 12 chars', async () => {
  for (const id of TERM_IDS) {
    const keys = new Set<string>()
    for (const s of TERMS[id]!.params) {
      expect(s.values).toContain(s.def)
      expect(s.values.length).toBeLessThanOrEqual(12)
      expect(new Set(s.values.map(String)).size).toBe(s.values.length)
      expect(keys.has(s.key)).toBe(false)
      keys.add(s.key)
      expect(s.en.length).toBeLessThanOrEqual(12)
      expect(s.ko.length).toBeLessThanOrEqual(12)
    }
  }
})

test('every alt id exists and differs from its id', async () => {
  for (const id of TERM_IDS) {
    const alt = TERMS[id]!.alt
    expect(alt.length).toBeGreaterThan(0)
    for (const a of alt) {
      expect(a === id).toBe(false)
      expect(Object.hasOwn(TERMS, a)).toBe(true)
    }
  }
})

test('when <= 60 chars, caption <= 90 chars, both languages present', async () => {
  for (const id of TERM_IDS) {
    const t = TERMS[id]!
    for (const lang of ['en', 'ko'] as const) {
      expect(t.when[lang].length).toBeGreaterThan(0)
      expect(t.when[lang].length).toBeLessThanOrEqual(60)
      expect(t.caption[lang].length).toBeGreaterThan(0)
      expect(t.caption[lang].length).toBeLessThanOrEqual(90)
    }
    expect(/[ㄱ-힣]/.test(t.when.ko)).toBe(true)
    expect(/[ㄱ-힣]/.test(t.caption.ko)).toBe(true)
    expect(/[ㄱ-힣]/.test(t.ko)).toBe(true)
  }
})

test('every term has a preview scene', async () => {
  const missing = TERM_IDS.filter(id => !hasPreview(id))
  expect(missing).toEqual([])
})

test('nameOf, defaultsOf, chipsOf', async () => {
  expect(nameOf('card-layout', { lang: 'en' })).toBe('Card Layout')
  expect(nameOf('card-layout', { lang: 'ko' })).toBe('카드 레이아웃')
  expect(nameOf('nope', { lang: 'en' })).toBe('nope')
  expect(defaultsOf('card-layout')).toEqual({ cols: 3, md: 2, sm: 1, gap: 24 })
  expect(defaultsOf('nope')).toEqual({})
  expect(chipsOf('card-layout', defaultsOf('card-layout'), { lang: 'ko' })[0]).toBe('열 3')
  expect(chipsOf('card-layout', defaultsOf('card-layout'), { lang: 'ko' })).toEqual(['열 3', '1024px에서 2', '768px 아래 1', '간격 24px'])
  expect(chipsOf('sticky-header', { ...defaultsOf('sticky-header'), height: 72 }, { lang: 'en' })).toEqual(['height 72px', 'shadow on', 'mobile logo+menu'])
  expect(chipsOf('nope', {}, { lang: 'en' })).toEqual([])
})

test('parseValue returns the typed values entry, def when unknown', async () => {
  const cols = TERMS['card-layout']!.params[0]!
  expect(parseValue(cols, '4')).toBe(4)
  expect(parseValue(cols, '9')).toBe(3)
  const speed = TERMS['parallax']!.params[0]!
  expect([...speed.values]).toEqual([0.2, 0.3, 0.4, 0.5, 0.6])
  expect(parseValue(speed, '0.3')).toBe(0.3)
  const full = TERMS['modal']!.params[2]!
  expect(parseValue(full, 'none')).toBe('none')
  expect(parseValue(full, '480')).toBe(480)
  expect(parseValue(full, 'x')).toBe(640)
  const easing = TERMS['smooth-transition']!.params[1]!
  expect(parseValue(easing, 'spring')).toBe('spring')
})

test('param table matches the spec rows', async () => {
  const sig = (id: string) => TERMS[id]!.params.map(s => `${s.key}:${s.values.join('|')}=${s.def}${s.unit ?? ''}`).join(' ')
  expect(sig('card-layout')).toBe('cols:2|3|4|5|6=3 md:1|2|3|4=2 sm:1|2=1 gap:8|12|16|20|24|28|32|36|40|44|48=24px')
  expect(sig('toast')).toBe('pos:top-right|bottom-center|bottom-right=top-right ms:3000|4000|5000|6000|7000|8000=4000ms stack:1|2|3|4|5=3')
  expect(sig('scroll-reveal')).toBe('threshold:10|20|30|40|50=20% ms:300|400|500|600|700|800=500ms rise:0|8|16|24|32=16px once:on|off=on')
  expect(sig('modal')).toBe('width:400|440|480|520|560|600|640|680|720=560px backdrop:dim|blur=dim full_below:480|640|none=640px')
  expect(sig('sidebar-layout')).toBe('width:200|220|240|260|280|300|320=260px md:rail|hidden=rail sm:drawer|hidden=drawer')
  expect(TERMS['drawer']!.alt).toEqual(['modal', 'bottom-sheet', 'sidebar-layout'])
  expect(TERMS['hero-section']!.alt).toEqual(['split-layout', 'card-layout'])
})
