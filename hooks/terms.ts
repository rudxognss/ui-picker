/** The mod's half of skills/ui-vocab/terms.md: names, when-lines, preview captions, editable params, swap alternatives. No deps. */

import type { L, Lang } from '../types'

export type { Lang }
type Builtin = 'en' | 'ko'
type Cat = 'layout' | 'component' | 'effect'
type ParamSpec = { key: string; en: string; ko: string; unit?: string; values: readonly (string | number)[]; def: string | number }
type Term = { en: string; ko: string; cat: Cat; when: Record<Builtin, string>; caption: Record<Builtin, string>; params: ParamSpec[]; alt: string[] }

/** `a..b` by `s` (inclusive), rounded to the step's precision so 0.1 steps stay exact. */
const range = (a: number, b: number, s = 1): number[] => {
  const n = Math.round((b - a) / s)
  const digits = (String(s).split('.')[1] ?? '').length
  return Array.from({ length: n + 1 }, (_, i) => Number((a + i * s).toFixed(digits)))
}

const p = (key: string, en: string, ko: string, values: readonly (string | number)[], def: string | number, unit?: string): ParamSpec =>
  unit === undefined ? { key, en, ko, values, def } : { key, en, ko, unit, values, def }

const cols = p('cols', 'columns', '열', range(2, 6), 3)
const md = p('md', 'at 1024px', '1024px에서', range(1, 4), 2)
const sm = p('sm', 'under 768px', '768px 아래', range(1, 2), 1)
const ms = (values: readonly number[], def: number): ParamSpec => p('ms', 'duration', '시간', values, def, 'ms')
const mobile = (values: readonly string[], def: string): ParamSpec => p('mobile', 'mobile', '모바일', values, def)

export const TERMS: Readonly<Record<string, Term>> = {
  'hero-section': {
    en: 'Hero Section', ko: '히어로 섹션', cat: 'layout',
    when: { en: 'A landing page opens with one message and one primary CTA.', ko: '랜딩 페이지 첫 화면에 메시지 하나와 주요 행동 하나' },
    caption: { en: 'Headline, subline and one CTA button on the left; an image slides in on the right', ko: '왼쪽에 헤드라인·보조 문구·CTA 버튼 하나, 오른쪽에서 이미지가 미끄러져 들어옴' },
    params: [p('ctas', 'CTAs', 'CTA 수', [1, 2], 1), p('media', 'media', '미디어', ['right', 'background', 'none'], 'right'), p('stack', 'stack under', '쌓임 기준', [640, 768, 1024], 768, 'px')],
    alt: ['split-layout', 'card-layout'],
  },
  'responsive-layout': {
    en: 'Responsive Layout', ko: '반응형 레이아웃', cat: 'layout',
    when: { en: 'The same page must work on phones, tablets and desktops.', ko: '같은 페이지가 폰·태블릿·데스크톱에서 모두 동작해야 할 때' },
    caption: { en: 'The viewport narrows from desktop to phone; three columns reflow to two, then one', ko: '화면이 데스크톱에서 폰 폭으로 줄어들며 3열이 2열, 1열로 재배치됨' },
    params: [cols, md, sm, p('bp_md', 'md break', 'md 분기점', [1024, 1280], 1024, 'px'), p('bp_sm', 'sm break', 'sm 분기점', [640, 768], 768, 'px')],
    alt: ['card-layout'],
  },
  'card-layout': {
    en: 'Card Layout', ko: '카드 레이아웃', cat: 'layout',
    when: { en: 'Many same-kind items, each with image, title and one line.', ko: '이미지·제목·한 줄 설명을 가진 같은 종류의 항목이 여럿일 때' },
    caption: { en: 'A grid of equal cards fills in row by row; the pointer hovers one and it lifts', ko: '같은 크기의 카드가 격자로 채워지고, 포인터가 올라간 카드가 살짝 떠오름' },
    params: [cols, md, sm, p('gap', 'gap', '간격', range(8, 48, 4), 24, 'px')],
    alt: ['bento-grid', 'carousel'],
  },
  'bento-grid': {
    en: 'Bento Grid', ko: '벤토 그리드', cat: 'layout',
    when: { en: 'A feature or highlights section with unequal items.', ko: '중요도가 다른 항목을 모은 기능·하이라이트 섹션' },
    caption: { en: 'Tiles of mixed sizes snap into a grid; one large feature tile anchors the corner', ko: '크기가 다른 타일이 격자에 맞춰 채워지고, 큰 강조 타일 하나가 모서리를 잡음' },
    params: [p('cols', 'columns', '열', [3, 4, 6], 4), p('feature', 'feature', '강조 칸', ['2x2', '2x1', '3x2'], '2x2'), p('gap', 'gap', '간격', range(8, 32, 4), 16, 'px')],
    alt: ['card-layout', 'hero-section'],
  },
  'sidebar-layout': {
    en: 'Sidebar Layout', ko: '사이드바 레이아웃', cat: 'layout',
    when: { en: 'An app with 4+ sections switched often (dashboard, docs).', ko: '자주 오가는 섹션이 4개 이상인 앱 (대시보드, 관리자, 문서)' },
    caption: { en: 'A fixed left nav slides in and stays while the content beside it changes', ko: '왼쪽 고정 내비게이션이 들어와 머물고, 옆의 콘텐츠만 바뀜' },
    params: [p('width', 'width', '너비', range(200, 320, 20), 260, 'px'), p('md', 'at 1024px', '1024px에서', ['rail', 'hidden'], 'rail'), p('sm', 'under 768px', '768px 아래', ['drawer', 'hidden'], 'drawer')],
    alt: ['drawer', 'tabs'],
  },
  'sticky-header': {
    en: 'Sticky Header', ko: '스티키 헤더', cat: 'layout',
    when: { en: 'Top nav or a primary action stays reachable on a long page.', ko: '긴 페이지에서 상단 내비나 주요 버튼이 항상 보여야 할 때' },
    caption: { en: 'The page scrolls under a header that stays pinned at the top and gains a shadow', ko: '페이지가 스크롤돼도 헤더는 상단에 고정되고 그림자가 생김' },
    params: [p('height', 'height', '높이', range(48, 80, 4), 64, 'px'), p('shadow', 'shadow', '그림자', ['on', 'off'], 'on'), mobile(['logo+menu', 'full'], 'logo+menu')],
    alt: ['sidebar-layout'],
  },
  'split-layout': {
    en: 'Split Layout', ko: '스플릿 레이아웃', cat: 'layout',
    when: { en: 'Two equal partners: text beside media, form beside preview.', ko: '텍스트와 미디어, 폼과 미리보기처럼 동등한 두 영역이 나란히' },
    caption: { en: 'Two equal halves side by side: text left, media right; they stack at phone width', ko: '텍스트 왼쪽, 미디어 오른쪽 반반 배치; 폰 폭에서는 위아래로 쌓임' },
    params: [p('ratio', 'ratio', '비율', ['50/50', '60/40', '40/60'], '50/50'), p('gap', 'gap', '간격', range(24, 64, 8), 48, 'px'), mobile(['media-first', 'text-first'], 'media-first')],
    alt: ['hero-section', 'sidebar-layout'],
  },
  tabs: {
    en: 'Tabs', ko: '탭', cat: 'component',
    when: { en: '2-6 peer views of one object, one visible at a time.', ko: '한 대상의 동등한 뷰 2~6개를 한 번에 하나씩 보여줄 때' },
    caption: { en: 'Three tabs; clicking one slides the underline and swaps the panel', ko: '탭 세 개; 하나를 클릭하면 밑줄이 이동하고 패널이 바뀜' },
    params: [p('indicator', 'indicator', '표시', ['underline', 'pill'], 'underline'), mobile(['scroll', 'dropdown'], 'scroll')],
    alt: ['accordion', 'sidebar-layout'],
  },
  accordion: {
    en: 'Accordion', ko: '아코디언', cat: 'component',
    when: { en: 'Long content in sections the user opens selectively (FAQ).', ko: 'FAQ처럼 사용자가 골라 펼치는 독립 섹션들' },
    caption: { en: 'Stacked FAQ rows; clicking one expands its body and turns the chevron', ko: '쌓인 FAQ 행; 하나를 클릭하면 본문이 펼쳐지고 화살표가 회전함' },
    params: [p('multi', 'multi open', '복수 열기', ['on', 'off'], 'on'), ms(range(150, 300, 50), 200), p('icon', 'icon', '아이콘', ['chevron', 'plus'], 'chevron')],
    alt: ['tabs'],
  },
  modal: {
    en: 'Modal', ko: '모달', cat: 'component',
    when: { en: 'One task must be finished or dismissed before returning.', ko: '확인·짧은 폼처럼 끝내거나 닫아야 돌아갈 수 있는 작업' },
    caption: { en: 'A centered dialog grows from the middle over a dimmed page; Cancel or Esc closes it', ko: '어두워진 페이지 가운데에서 대화상자가 커지며 나타남; 취소나 Esc로 닫힘' },
    params: [p('width', 'width', '너비', range(400, 720, 40), 560, 'px'), p('backdrop', 'backdrop', '배경', ['dim', 'blur'], 'dim'), p('full_below', 'full below', '전체화면 기준', [480, 640, 'none'], 640, 'px')],
    alt: ['drawer', 'bottom-sheet'],
  },
  drawer: {
    en: 'Drawer', ko: '드로어', cat: 'component',
    when: { en: 'Secondary content or settings that must not leave the page.', ko: '현재 페이지를 떠나지 않고 보여줄 보조 콘텐츠나 설정' },
    caption: { en: 'A panel slides in from the right over a dimmed page; Esc closes it', ko: '어두워진 페이지 위로 패널이 오른쪽에서 밀려 들어옴; Esc로 닫힘' },
    params: [p('side', 'side', '방향', ['right', 'left'], 'right'), p('width', 'width', '너비', range(320, 480, 40), 400, 'px'), mobile(['full', 'same'], 'full')],
    alt: ['modal', 'bottom-sheet', 'sidebar-layout'],
  },
  'bottom-sheet': {
    en: 'Bottom Sheet', ko: '바텀 시트', cat: 'component',
    when: { en: 'Touch-first options or details that keep the page visible.', ko: '페이지를 보이게 둔 채 터치로 여는 옵션이나 상세' },
    caption: { en: 'On a phone, a sheet with a handle slides up from the bottom; a tap outside closes it', ko: '폰에서 핸들 달린 시트가 아래에서 올라옴; 바깥을 탭하면 닫힘' },
    params: [p('snaps', 'snap points', '스냅 지점', ['50/90', '40/90', '90'], '50/90'), p('handle', 'handle', '핸들', ['on', 'off'], 'on'), p('desktop', 'desktop', '데스크톱', ['modal', 'same'], 'modal')],
    alt: ['drawer', 'modal'],
  },
  dropdown: {
    en: 'Dropdown', ko: '드롭다운', cat: 'component',
    when: { en: 'One pick from 4-15 options, or a short menu behind a button.', ko: '4~15개 중 하나 고르기, 또는 버튼 하나 뒤의 짧은 메뉴' },
    caption: { en: 'Clicking a button drops a list below it; the pointer highlights a row and picks it', ko: '버튼을 클릭하면 아래로 목록이 내려오고, 포인터가 한 행을 짚어 선택함' },
    params: [p('align', 'align', '정렬', ['start', 'end'], 'start'), p('max_items', 'max items', '최대 항목', range(5, 12), 8), ms(range(100, 200, 50), 150)],
    alt: ['tabs', 'tooltip'],
  },
  tooltip: {
    en: 'Tooltip', ko: '툴팁', cat: 'component',
    when: { en: 'A short, non-essential hint for an icon or truncated text.', ko: '아이콘이나 잘린 텍스트에 붙는 짧고 부수적인 힌트' },
    caption: { en: 'The pointer rests on an icon; after a delay a small label fades in above it', ko: '포인터가 아이콘 위에 머물면 잠시 뒤 작은 라벨이 위에 떠오름' },
    params: [p('delay', 'delay', '지연', range(0, 700, 100), 300, 'ms'), p('side', 'side', '위치', ['top', 'bottom', 'auto'], 'top'), p('touch', 'touch', '터치', ['off', 'on'], 'off')],
    alt: ['dropdown', 'toast'],
  },
  toast: {
    en: 'Toast', ko: '토스트', cat: 'component',
    when: { en: 'Confirms a completed action or a non-blocking status change.', ko: '완료된 동작이나 막지 않는 상태 변화를 알릴 때' },
    caption: { en: 'After a click, a notice slides in at the top-right, counts down and slides out by itself', ko: '클릭 뒤 오른쪽 위에 작은 알림이 들어오고 카운트다운 후 스스로 미끄러져 나감' },
    params: [p('pos', 'position', '위치', ['top-right', 'bottom-center', 'bottom-right'], 'top-right'), ms(range(3000, 8000, 1000), 4000), p('stack', 'stack', '최대 개수', range(1, 5), 3)],
    alt: ['modal', 'tooltip'],
  },
  carousel: {
    en: 'Carousel', ko: '캐러셀', cat: 'component',
    when: { en: 'Visual items in limited space where one at a time is fine.', ko: '한 번에 하나씩 보여도 되는 갤러리·후기 같은 시각 항목' },
    caption: { en: 'One slide fills the frame; an arrow click slides the next one in and moves the dots', ko: '슬라이드 하나가 프레임을 채우고, 화살표 클릭에 다음 슬라이드가 들어오며 점이 이동함' },
    params: [p('visible', 'visible', '표시 개수', range(1, 4), 1), p('autoplay', 'autoplay', '자동 재생', ['off', 'on'], 'off'), p('dots', 'dots', '점 표시', ['on', 'off'], 'on')],
    alt: ['card-layout', 'scroll-snap'],
  },
  skeleton: {
    en: 'Skeleton', ko: '스켈레톤', cat: 'component',
    when: { en: 'Content takes 300ms-3s to load and its shape is known.', ko: '0.3~3초 걸리는 로딩에 콘텐츠 모양이 미리 정해진 경우' },
    caption: { en: 'Grey placeholder bars shimmer in the content shape, then real text and image replace them', ko: '콘텐츠 모양의 회색 자리표시자가 반짝이다가 실제 텍스트와 이미지로 바뀜' },
    params: [p('shimmer', 'shimmer', '반짝임', ['on', 'off'], 'on'), p('min_ms', 'min show', '최소 표시', range(0, 500, 100), 200, 'ms')],
    alt: ['toast'],
  },
  'hover-effect': {
    en: 'Hover Effect', ko: '호버 이펙트', cat: 'effect',
    when: { en: 'Clickable cards, buttons or links need pointer affordance.', ko: '클릭 가능한 카드·버튼·링크에 포인터 반응이 필요할 때' },
    caption: { en: 'The pointer moves onto a card; it lifts with a shadow and settles back when it leaves', ko: '포인터가 카드 위로 가면 그림자와 함께 떠오르고, 벗어나면 제자리로' },
    params: [p('lift', 'lift', '리프트', range(0, 8), 2, 'px'), ms(range(100, 400, 50), 150), p('focus', 'focus', '포커스', ['same', 'none'], 'same')],
    alt: ['micro-interaction', 'smooth-transition'],
  },
  'scroll-reveal': {
    en: 'Scroll Reveal', ko: '스크롤 리빌', cat: 'effect',
    when: { en: 'A long marketing page whose sections appear one by one.', ko: '섹션이 하나씩 등장해야 하는 긴 마케팅 페이지' },
    caption: { en: 'As the page scrolls, each section fades in and rises when it crosses the trigger line', ko: '스크롤하면 각 섹션이 기준선을 지날 때 떠오르며 서서히 나타남' },
    params: [p('threshold', 'threshold', '임계값', range(10, 50, 10), 20, '%'), ms(range(300, 800, 100), 500), p('rise', 'rise', '상승', range(0, 32, 8), 16, 'px'), p('once', 'once', '한 번만', ['on', 'off'], 'on')],
    alt: ['stagger', 'parallax'],
  },
  stagger: {
    en: 'Stagger', ko: '스태거', cat: 'effect',
    when: { en: 'A list or grid enters and its items should read as a group.', ko: '리스트나 그리드가 등장할 때 항목들이 리듬 있게 보여야 할 때' },
    caption: { en: 'Four cards enter one after another, each a beat later; a timeline dot marks the rhythm', ko: '카드 네 장이 한 박자씩 늦게 차례로 들어오고, 타임라인 점이 리듬을 표시함' },
    params: [p('step', 'step', '간격', range(40, 120, 20), 60, 'ms'), ms(range(200, 500, 50), 300), p('cap', 'cap', '최대 개수', range(6, 12), 8)],
    alt: ['scroll-reveal'],
  },
  'smooth-transition': {
    en: 'Smooth Transition', ko: '스무스 트랜지션', cat: 'effect',
    when: { en: 'A state change (open, filter, theme) would otherwise jump.', ko: '열기·필터·테마 같은 상태 변화가 툭 바뀌지 않게' },
    caption: { en: 'A click toggles a view; the old panel eases out while the new one eases in, no jump', ko: '클릭으로 뷰가 바뀔 때 이전 패널은 부드럽게 사라지고 새 패널이 들어옴' },
    params: [ms(range(150, 400, 50), 200), p('easing', 'easing', '이징', ['ease-out', 'ease-in-out', 'spring'], 'ease-out')],
    alt: ['micro-interaction'],
  },
  glassmorphism: {
    en: 'Glassmorphism', ko: '글래스모피즘', cat: 'effect',
    when: { en: 'A floating panel over colorful content should feel layered.', ko: '화려한 배경 위에 떠 있는 패널이 겹쳐 보여야 할 때' },
    caption: { en: 'A translucent frosted panel slides over colorful shapes, blurring what lies beneath it', ko: '반투명한 유리 패널이 색색의 도형 위로 들어와 아래를 흐리게 비춤' },
    params: [p('blur', 'blur', '블러', range(8, 24, 4), 12, 'px'), p('opacity', 'opacity', '불투명도', range(50, 90, 10), 70, '%'), p('border', 'border', '테두리', ['on', 'off'], 'on')],
    alt: ['smooth-transition'],
  },
  parallax: {
    en: 'Parallax', ko: '패럴랙스', cat: 'effect',
    when: { en: 'A hero or story section wants depth from 2-3 layers.', ko: '2~3개 레이어로 깊이감을 주려는 히어로나 스토리 섹션' },
    caption: { en: 'Scrolling moves the front card far and the hills behind it a little, giving depth', ko: '스크롤 시 앞 카드는 많이, 뒤 언덕은 조금 움직여 깊이감이 생김' },
    params: [p('speed', 'speed', '속도', range(0.2, 0.6, 0.1), 0.4), p('layers', 'layers', '레이어', range(1, 3), 2), mobile(['still', 'on'], 'still')],
    alt: ['scroll-reveal'],
  },
  'scroll-snap': {
    en: 'Scroll Snap', ko: '스크롤 스냅', cat: 'effect',
    when: { en: 'A page or gallery where each item aligns after scrolling.', ko: '스크롤 뒤 항목이 정확히 맞춰 멈춰야 하는 페이지나 갤러리' },
    caption: { en: 'A scroll stops mid-way, then the nearest section snaps into alignment with the frame', ko: '스크롤이 중간에 멈추면 가장 가까운 섹션이 프레임에 딱 맞춰 정렬됨' },
    params: [p('axis', 'axis', '축', ['y', 'x'], 'y'), p('align', 'align', '정렬', ['start', 'center'], 'start'), p('strictness', 'strictness', '엄격도', ['mandatory', 'proximity'], 'proximity')],
    alt: ['carousel'],
  },
  'micro-interaction': {
    en: 'Micro-interaction', ko: '마이크로 인터랙션', cat: 'effect',
    when: { en: 'A small action (like, toggle, copy) needs instant feedback.', ko: '좋아요·토글·복사 같은 작은 동작에 즉각 피드백이 필요할 때' },
    caption: { en: 'A tap on a heart button; it pops larger and fills with color, then settles', ko: '하트 버튼을 누르면 커지며 색이 채워지고 다시 제자리로' },
    params: [ms(range(100, 300, 50), 150), p('feedback', 'feedback', '피드백', ['scale', 'color', 'both'], 'scale')],
    alt: ['hover-effect'],
  },
}

export const TERM_IDS: readonly string[] = Object.keys(TERMS)

/** 'ko' reads the Korean column; every other code reads English (labels are checked first by the lookups below). */
const builtin = (lang: Lang): Builtin => (lang === 'ko' ? 'ko' : 'en')

export const nameOf = (id: string, l: L): string => l.labels?.terms?.[id]?.name ?? TERMS[id]?.[builtin(l.lang)] ?? id

export const textOf = (id: string, field: 'when' | 'caption', l: L): string =>
  l.labels?.terms?.[id]?.[field] ?? TERMS[id]?.[field][builtin(l.lang)] ?? ''

export const paramLabel = (id: string, s: ParamSpec, l: L): string => l.labels?.terms?.[id]?.params?.[s.key] ?? s[builtin(l.lang)]

export const defaultsOf = (id: string): Record<string, string | number> =>
  Object.fromEntries((TERMS[id]?.params ?? []).map(s => [s.key, s.def]))

export const chipsOf = (id: string, params: Record<string, string | number>, l: L): string[] =>
  (TERMS[id]?.params ?? []).map(s => `${paramLabel(id, s, l)} ${params[s.key] ?? s.def}${s.unit ?? ''}`)

export const parseValue = (spec: ParamSpec, raw: string): string | number => spec.values.find(v => String(v) === raw) ?? spec.def
