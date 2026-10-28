# ui-vocab examples

Three requests end to end: request → area table → the one `ui_pick` call → what the pane shows → the exact message the model receives → build checklist. Rules in `SKILL.md`; cards in `terms.md`. Payload sizes measured with `wc -c` on the single-line JSON.

## Example 1: bakery site (1 question; Korean)

Request: `빵집 사이트 하나 만들어보자`

| area | classification | `ui` value |
|---|---|---|
| 상단 내비게이션 | default (top navigation → sticky-header) | `"sticky-header"` |
| 상단 영역 | default (landing opens with one message) | `"hero-section"` |
| 빵 메뉴 | ask (area implied by "빵집", pattern not named, 3 fit, structure differs) | `["card-layout", "bento-grid", "carousel"]` |
| 메뉴 카드 | default (clickable cards need pointer affordance) | `"hover-effect"` |

`ui_pick` (191 B; `lang` inferred `ko` from Hangul):

```json
{"title":"빵집 사이트","ui":{"상단 내비게이션":"sticky-header","상단 영역":"hero-section","빵 메뉴":["card-layout","bento-grid","carousel"],"메뉴 카드":"hover-effect"}}
```

Result `{"review":true,"questions":1}`. The turn ends with one line: `오른쪽 패널을 확인하세요.`

Pane: `질문 1/1` over three animated cards `1: 카드 레이아웃 · 추천`, `2: 벤토 그리드`, `3: 캐러셀`; the person presses `1`, the review lists `결정 4`, opens row 3 (`3`) and sets 열 → 4, 간격 → 16px, opens row 4 and sets 리프트 → 4px with the note `그림자도 살짝`, then Enter on `빌드`.

Message the model receives (user message; `tests/confirm.test.ts`):

```
ui-picker: build
- 상단 내비게이션: Sticky Header
- 상단 영역: Hero Section
- 빵 메뉴: Card Layout (네 선택) · cols 4 · gap 16px
- 메뉴 카드: Hover Effect (변경) · lift 4px · "그림자도 살짝"
```

Build checklist (card `defaults` + listed params; unlisted params keep the card default):
- Sticky Header: `position: sticky; top: 0`, height 64px, shadow once scrolled, skip-to-content link first in DOM, `<header>` with `<nav>`, logo plus menu button on mobile.
- Hero Section: one headline, one subline, one primary CTA with a focus ring, media on the right with alt text, one column under 768px.
- Card Layout: 4 equal-height cards per row (`cols 4`), 16px gap, 2 at 1024px, 1 under 768px, one action per card, alt text on images.
- Hover Effect: 4px lift (`lift 4px`) plus a soft shadow (the note), 150ms ease-out, same on `:focus-visible`, only under `@media (hover: hover)`.

## Example 2: pricing page (0 questions; review only)

Request: `Pricing page: three plan cards, FAQ as an accordion, and keep the header on top when scrolling.`

| area | classification | `ui` value |
|---|---|---|
| header | stated, alias "on top when scrolling" | `"sticky-header"` |
| top | default (page opens with one message) | `"hero-section"` |
| plans | stated, alias "cards"; "three" fixes `cols` | `"card-layout"`, `params.plans.cols = 3` |
| faq | stated, term | `"accordion"` |

`ui_pick` (147 B; `lang` inferred `en`):

```json
{"title":"Pricing page","ui":{"header":"sticky-header","top":"hero-section","plans":"card-layout","faq":"accordion"},"params":{"plans":{"cols":3}}}
```

Result `{"review":true,"questions":0}`. The turn ends with one line: `Check the right pane.`

Pane: no question; the review opens at once with `Pricing page · decisions 4`, four `[model]` rows with their chips, and `Build` focused; the person presses Enter.

Message the model receives (no tags: nothing was asked or edited; `cols 3` equals the card default so it is not listed):

```
ui-picker: build
- header: Sticky Header
- top: Hero Section
- plans: Card Layout
- faq: Accordion
```

Build checklist:
- Sticky Header: `position: sticky`, 64px, shadow once scrolled, skip-to-content link first, logo plus menu button on mobile.
- Hero Section: one headline, one subline, one primary CTA with a focus ring, one column under 768px.
- Card Layout: three equal-height plan cards, 24px gap, one labelled CTA each, 2 per row at 1024px, 1 under 768px.
- Accordion: `<button aria-expanded>` headers with `aria-controls`, chevron, 200ms expand, several may be open, headers ≥44px on mobile.

## Example 3: Korean app landing page (3 questions; one answered, Esc, then a change typed instead of Enter)

Request: `우리 앱 랜딩 페이지 만들어 줘. 기능 소개랑 사용자 후기 넣고, 멋지게 요즘 느낌으로.`

| area | classification | `ui` value |
|---|---|---|
| 내비게이션 | default | `"sticky-header"` |
| 상단 영역 | default | `"hero-section"` |
| 기능 소개 | ask (area named, pattern not) | `["bento-grid", "card-layout", "split-layout"]` |
| 후기 | ask (area named, pattern not) | `["carousel", "card-layout"]` |
| 등장 효과 | ask (page-level "멋지게 요즘 느낌으로" → one entrance-effect question) | `["scroll-reveal", "stagger", "parallax"]` |

`ui_pick` (245 B):

```json
{"title":"앱 랜딩","ui":{"내비게이션":"sticky-header","상단 영역":"hero-section","기능 소개":["bento-grid","card-layout","split-layout"],"후기":["carousel","card-layout"],"등장 효과":["scroll-reveal","stagger","parallax"]}}
```

Result `{"review":true,"questions":3}`. The turn ends with one line: `오른쪽 패널을 확인하세요.`

Pane: `질문 1/3`; the person presses `1` (벤토 그리드), then Esc: questions 2 and 3 take their recommended ids and the review opens (`앱 랜딩 · 결정 5`, rows tagged `[네 선택]` and `[추천 적용]`); instead of Enter the person types `다크 모드로 해줘` in the prompt box.

What the model receives: the typed prompt `다크 모드로 해줘` with this pending block beside it (no `ui-picker: build` message; the pane stays open):

```
ui-picker: 패널에 확인 대기 중인 계획이 있습니다 (아직 확정 아님):
- 내비게이션: Sticky Header
- 상단 영역: Hero Section
- 기능 소개: Bento Grid (네 선택)
- 후기: Carousel (추천 적용)
- 등장 효과: Scroll Reveal (추천 적용)
If this prompt is a question or unrelated, answer it and leave the plan in the pane. If it changes or approves this UI plan, call ui_pick once more with the whole amended plan (the rows above as decided ids) and end the turn with "Check the right pane."; the person confirms there with Enter. Do not build from this block.
```

A dark theme is a change to the UI, so the model re-plans once, every row decided (the picks and the recommended ids kept; dark mode is a style, not a term, so it is carried in the note of the row it touches most, or simply remembered for the build):

```json
{"title":"앱 랜딩 (다크)","ui":{"내비게이션":"sticky-header","상단 영역":"hero-section","기능 소개":"bento-grid","후기":"carousel","등장 효과":"scroll-reveal"}}
```

Result `{"review":true,"questions":0}`; the turn ends with `오른쪽 패널을 확인하세요.`. The pane opens at review; the person presses Enter and the build message arrives:

```
ui-picker: build
- 내비게이션: Sticky Header
- 상단 영역: Hero Section
- 기능 소개: Bento Grid
- 후기: Carousel
- 등장 효과: Scroll Reveal
```

Had the person typed a question instead (`벤토 그리드가 뭐야?`), the same block would arrive, the model would answer it, and the pane would still show question 2/3 waiting.

Build checklist (the plan plus the prompt's change: dark theme):
- Sticky Header: `position: sticky`, 64px, shadow once scrolled, skip-to-content link first, logo plus menu button on mobile.
- Hero Section: one headline, one subline, one primary CTA, app screenshot on the right, one column under 768px.
- Bento Grid: one 2x2 feature tile on a 4-column grid, 16px gap, heading per tile, DOM order = reading order, one column under 768px.
- Carousel: one slide per view, prev/next buttons and dots, no autoplay, swipe on touch, `aria-roledescription="carousel"`, still under `prefers-reduced-motion`.
- Scroll Reveal: IntersectionObserver at 20%, 500ms fade plus 16px rise, once, content readable without JS, none under `prefers-reduced-motion`.
- Dark theme on every surface (from the prompt); contrast ≥4.5:1.
