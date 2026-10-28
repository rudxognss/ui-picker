# ui-vocab terms

25 cards in preview order. `id` = the value the model sends in `ui_pick`'s `ui` (and the swap list's key). The mod owns the names, the chips and the previews (`hooks/terms.ts`): the model sends ids, never labels. `aliases` = vague phrasings (`en: ...; ko: ...`). `when` = the fit. `defaults` = behavior; a11y; responsive, in that order: the build checklist, applied to every line of the build message, not editable in the pane. `params` = what the person edits in the pane (one Select per key) and what the model may preset via `ui_pick` `params` for a decided area when the request fixes the number; format `key values → default unit`, a range `a-b` or `a-b/step` lists every step, `|` separates fixed choices. `avoid` = the misuse. `confusable` = neighbor terms with the deciding question.

## Layout

### hero-section
- id: `hero-section`
- en: Hero Section
- ko: 히어로 섹션
- aliases: en: "the big top part", "first thing you see", "banner at the top", "intro with a big button"; ko: "맨 위 큰 부분", "첫 화면", "상단 배너", "처음 보이는 영역"
- category: layout
- when: A landing page opens with one message and one primary action above the fold.
- defaults: one headline, one subline, one primary CTA (a second CTA is ghost style at most); CTA is a real button or link with a visible focus ring, media has alt text or `aria-hidden` when decorative; one column under 768px with the CTA full width
- avoid: Two equal CTAs or a Carousel inside the hero.
- confusable: Split Layout (is the media an equal partner to the text? → Split Layout); Card Layout (one message or many items? → Card Layout for many)
- params: ctas 1|2 → 1; media right|background|none → right; stack 640|768|1024 → 768 px

### responsive-layout
- id: `responsive-layout`
- en: Responsive Layout
- ko: 반응형 레이아웃
- aliases: en: "works on phones too", "fits any screen", "looks fine on mobile", "shrinks properly"; ko: "폰에서도 잘 보이게", "화면 크기에 맞게", "모바일 대응", "작은 화면에서도 깨지지 않게"
- category: layout
- when: The same page must work on phones, tablets and desktops.
- defaults: fluid widths, columns reflow 3 → 2 → 1 at 1024px and 768px; touch targets ≥44px, body text ≥16px on mobile; no horizontal scroll at 320px, images `max-width: 100%`
- avoid: Hiding content on mobile instead of reflowing it.
- confusable: Card Layout (a reflow rule or a content pattern? → Responsive Layout is the rule every layout obeys); Sidebar Layout (does the sidebar collapse? → still Responsive Layout applied to it)
- params: cols 2-6 → 3; md 1-4 → 2; sm 1|2 → 1; bp_md 1024|1280 → 1024 px; bp_sm 640|768 → 768 px

### card-layout
- id: `card-layout`
- en: Card Layout
- ko: 카드 레이아웃
- aliases: en: "a box for each item", "tiles", "little panels in a grid", "each thing in its own box"; ko: "항목마다 박스", "타일처럼", "네모 칸으로 나열", "하나씩 박스에 담아서"
- category: layout
- when: Many items of the same kind, each with image, title and one line of text.
- defaults: equal-height cards in a 3-column grid, 16–24px gap, one action per card; the whole card is one link or has one labelled button, images have alt text; 2 columns at 1024px, 1 under 768px
- avoid: Cards with no action and no hierarchy (a plain list reads faster).
- confusable: Bento Grid (equal sizes or mixed? → Bento Grid for mixed); Carousel (all visible or one at a time? → Carousel for one at a time)
- params: cols 2-6 → 3; md 1-4 → 2; sm 1|2 → 1; gap 8-48/4 → 24 px

### bento-grid
- id: `bento-grid`
- en: Bento Grid
- ko: 벤토 그리드
- aliases: en: "boxes of different sizes", "like the Apple page", "mixed tiles", "big block with small ones around"; ko: "크기 다른 박스들", "애플 사이트처럼", "큰 칸 작은 칸 섞어서", "불규칙한 격자"
- category: layout
- when: A feature or highlights section with items of unequal importance.
- defaults: one 2×2 feature tile plus smaller tiles on a 4-column grid, same gap and radius everywhere; reading order follows DOM order, every tile has a heading; one column under 768px, feature tile first
- avoid: Every tile a different size (one feature tile, the rest in at most two sizes).
- confusable: Card Layout (equal items? → Card Layout); Hero Section (one message? → Hero Section)
- params: cols 3|4|6 → 4; feature 2x2|2x1|3x2 → 2x2; gap 8-32/4 → 16 px

### sidebar-layout
- id: `sidebar-layout`
- en: Sidebar Layout
- ko: 사이드바 레이아웃
- aliases: en: "menu on the left", "navigation down the side", "admin panel look", "left column with links"; ko: "왼쪽에 메뉴", "옆에 메뉴 있는", "관리자 화면처럼", "세로로 긴 메뉴"
- category: layout
- when: An app with 4+ sections the user switches between often (dashboard, admin, docs).
- defaults: fixed 240–280px left column, current item highlighted; `<nav aria-label>`, current link `aria-current="page"`, all items keyboard reachable; icon rail at 1024px, Drawer under 768px
- avoid: Marketing content in the sidebar (it is for navigation).
- confusable: Drawer (always visible or on demand? → Drawer for on demand); Tabs (few peer views on one page? → Tabs)
- params: width 200-320/20 → 260 px; md rail|hidden → rail; sm drawer|hidden → drawer

### sticky-header
- id: `sticky-header`
- en: Sticky Header
- ko: 스티키 헤더
- aliases: en: "menu bar that stays on top", "header follows when scrolling", "fixed top bar", "nav that never disappears"; ko: "스크롤해도 따라오는 메뉴", "위에 고정된 바", "항상 보이는 상단 메뉴", "안 사라지는 헤더"
- category: layout
- when: Top navigation or a primary action must stay reachable on a long page.
- defaults: `position: sticky` at `top: 0`, shadow once scrolled, height ≤64px; skip-to-content link first in DOM, `<header>` containing `<nav>`; logo plus menu button only on mobile
- avoid: A tall sticky header that eats the mobile viewport.
- confusable: Sidebar Layout (horizontal top or vertical side? → Sidebar Layout for side); Toast (navigation or a message? → Toast for a message)
- params: height 48-80/4 → 64 px; shadow on|off → on; mobile logo+menu|full → logo+menu

### split-layout
- id: `split-layout`
- en: Split Layout
- ko: 스플릿 레이아웃
- aliases: en: "half and half", "text on one side, picture on the other", "two columns side by side", "image next to the words"; ko: "반반 나눠서", "한쪽 글 한쪽 그림", "좌우로 나눈 화면", "옆에 사진 붙여서"
- category: layout
- when: Two equal partners: text beside media, form beside preview, login beside artwork.
- defaults: two 50/50 columns, vertically centered, 48px gap, text column ≤60ch; media has alt text, text column first in DOM; one column under 768px with media above text
- avoid: Splitting when one side has almost no content (use a Hero Section).
- confusable: Hero Section (equal partners or one message with a backdrop? → Hero Section for one message); Sidebar Layout (navigation or content? → Sidebar Layout for navigation)
- params: ratio 50/50|60/40|40/60 → 50/50; gap 24-64/8 → 48 px; mobile media-first|text-first → media-first

## Component

### tabs
- id: `tabs`
- en: Tabs
- ko: 탭
- aliases: en: "switch between sections", "clickable headings at the top", "like browser tabs", "toggle between views"; ko: "눌러서 바꾸는 메뉴", "위에 제목 눌러서 전환", "브라우저 탭처럼", "화면 전환 버튼들"
- category: component
- when: 2–6 peer views of one object, one visible at a time, on one page.
- defaults: one active tab with an underline indicator, panel swaps in place, URL hash per tab; `role="tablist"`, arrow keys move between tabs, `aria-selected` and `aria-controls` set; horizontal scroll on mobile, Dropdown above 6 tabs
- avoid: Tabs for sequential steps (that is a wizard) or for navigation between pages.
- confusable: Accordion (one view at a time, or stacked sections with several open? → Accordion for stacked); Sidebar Layout (page-level navigation? → Sidebar Layout)
- params: indicator underline|pill → underline; mobile scroll|dropdown → scroll

### accordion
- id: `accordion`
- en: Accordion
- ko: 아코디언
- aliases: en: "click to expand", "collapsible sections", "FAQ style", "opens and closes"; ko: "눌러서 펼치기", "접었다 펴는 거", "FAQ처럼", "열고 닫는 목록"
- category: component
- when: Long content in independent sections the user scans and opens selectively (FAQ, settings groups).
- defaults: headers are buttons with a rotating chevron, 200ms expand, several may be open; `<button aria-expanded>` controls a region via `aria-controls`, Enter and Space toggle; full width on mobile, headers ≥44px
- avoid: Hiding the one piece of content every user needs.
- confusable: Tabs (peer views one at a time, or stacked sections? → Tabs for one at a time); Dropdown (pick a value or reveal content? → Dropdown for a value)
- params: multi on|off → on; ms 150-300/50 → 200 ms; icon chevron|plus → chevron

### modal
- id: `modal`
- en: Modal
- ko: 모달
- aliases: en: "popup in the middle", "a window over the page", "confirmation box", "dialog that blocks everything"; ko: "가운데 뜨는 팝업", "화면 위에 뜨는 창", "확인 창", "뒤가 어두워지는 창"
- category: component
- when: The user must finish or dismiss one task before returning (confirm, short form, critical notice).
- defaults: centered, backdrop dims the page, closes on Esc, backdrop click and a Close button; `role="dialog" aria-modal="true"` with a labelled title, focus moves in on open and back to the trigger on close, body scroll locked; full screen under 640px
- avoid: Nesting modals or opening one on page load.
- confusable: Drawer (blocking task or side content? → Drawer for side content); Toast (needs a response or only informs? → Toast when it only informs); Bottom Sheet (touch-first with the page visible? → Bottom Sheet)
- params: width 400-720/40 → 560 px; backdrop dim|blur → dim; full_below 480|640|none → 640 px

### drawer
- id: `drawer`
- en: Drawer
- ko: 드로어
- aliases: en: "slides out from the side", "side panel", "the thing that slides in from the right", "slide-out menu"; ko: "옆에서 쓱 나오는", "사이드 패널", "오른쪽에서 밀려 나오는 것", "옆에서 열리는 메뉴"
- category: component
- when: Secondary content or settings that must not leave the current page.
- defaults: opens on trigger click, closes on Esc and outside click; focus trapped while open and restored on close, `role="dialog"` with a labelled title; full width on mobile
- avoid: Using it for a blocking confirmation (that is a Modal).
- confusable: Modal (must the user finish before returning? → Modal); Bottom Sheet (touch-first, from the bottom? → Bottom Sheet); Sidebar Layout (always visible? → Sidebar Layout)
- params: side right|left → right; width 320-480/40 → 400 px; mobile full|same → full

### bottom-sheet
- id: `bottom-sheet`
- en: Bottom Sheet
- ko: 바텀 시트
- aliases: en: "slides up from the bottom", "like the maps app panel", "swipe-up thing", "mobile popup from below"; ko: "아래에서 올라오는 창", "지도 앱처럼 밑에서 올라오는", "밀어 올리는 패널", "모바일 밑 팝업"
- category: component
- when: Touch-first options or details that keep the page visible behind them.
- defaults: slides up with a drag handle, snap points at 50% and 90%, swipe down or backdrop tap closes; `role="dialog"` with a labelled title, Esc closes, focus trapped; Modal or Drawer above 768px
- avoid: Long forms inside a sheet (the keyboard covers it).
- confusable: Modal (touch-first with the page visible, or blocking and centered? → Modal for blocking); Drawer (from the side on desktop? → Drawer)
- params: snaps 50/90|40/90|90 → 50/90; handle on|off → on; desktop modal|same → modal

### dropdown
- id: `dropdown`
- en: Dropdown
- ko: 드롭다운
- aliases: en: "a menu that drops down", "click to see the options", "little list under a button", "select thing"; ko: "눌렀을 때 내려오는 메뉴", "옵션 목록 뜨는 거", "버튼 밑에 리스트", "선택 메뉴"
- category: component
- when: One choice from 4–15 options, or a short action menu behind one button.
- defaults: opens below the trigger (flips above near the viewport bottom), closes on select, Esc and outside click; `aria-haspopup` and `aria-expanded` on the trigger, arrow keys move, Enter selects, letters jump; native select or Bottom Sheet on touch under 640px
- avoid: Dropdowns for 2–3 options (radio buttons or Tabs) or for site navigation.
- confusable: Tabs (switch views or pick a value? → Tabs for views); Accordion (reveal content or pick? → Accordion for content); Tooltip (interactive list or passive hint? → Tooltip for a hint)
- params: align start|end → start; max_items 5-12 → 8; ms 100-200/50 → 150 ms

### tooltip
- id: `tooltip`
- en: Tooltip
- ko: 툴팁
- aliases: en: "little hint when you hover", "explanation bubble", "text that pops up on an icon", "help on hover"; ko: "마우스 올리면 뜨는 설명", "작은 말풍선", "아이콘에 뜨는 글", "호버 도움말"
- category: component
- when: A short, non-essential label or hint for an icon or truncated text.
- defaults: appears after 300ms hover or on focus, hides on leave, blur and Esc, one line of plain text, nothing interactive inside; `role="tooltip"` linked with `aria-describedby`, keyboard focus triggers it; replaced by a visible label on touch
- avoid: Required information or links inside a tooltip.
- confusable: Dropdown (interactive content? → Dropdown); Toast (hover-triggered or event-triggered? → Toast for an event); Modal (needs a response? → Modal)
- params: delay 0-700/100 → 300 ms; side top|bottom|auto → top; touch off|on → off

### toast
- id: `toast`
- en: Toast
- ko: 토스트
- aliases: en: "little message in the corner", "saved notification", "pops up and goes away", "snackbar"; ko: "구석에 잠깐 뜨는 알림", "저장됐다고 뜨는 거", "잠깐 나왔다 사라지는 메시지", "스낵바"
- category: component
- when: Confirming a completed action or a non-blocking status change.
- defaults: bottom-center or top-right, auto-dismiss after 4–6s, pauses on hover, one line plus optional Undo, max 3 stacked; `role="status"` (`role="alert"` for errors), dismiss button, never the only record of an error; full width above the bottom edge on mobile
- avoid: Toasts for errors the user must fix, or ones that vanish before they can be read.
- confusable: Modal (needs a response? → Modal); Tooltip (hover-triggered? → Tooltip); Skeleton (loading state? → Skeleton)
- params: pos top-right|bottom-center|bottom-right → top-right; ms 3000-8000/1000 → 4000 ms; stack 1-5 → 3

### carousel
- id: `carousel`
- en: Carousel
- ko: 캐러셀
- aliases: en: "slideshow", "swipe through the pictures", "arrows to see the next one", "rotating banner"; ko: "슬라이드쇼", "옆으로 넘기는 사진", "화살표로 넘기는 거", "돌아가는 배너"
- category: component
- when: A sequence of visual items in limited space where one at a time is acceptable (gallery, testimonials).
- defaults: prev/next buttons and dot indicators, no autoplay, swipe on touch, loops; `aria-roledescription="carousel"`, each slide `role="group"` labelled "n of N", buttons keyboard reachable, still under `prefers-reduced-motion`; one slide per view on mobile
- avoid: An autoplaying hero carousel (users read slide 1 only).
- confusable: Card Layout (all items visible at once? → Card Layout); Scroll Snap (free scroll that snaps, or buttons and dots? → Scroll Snap for free scroll); Tabs (text content? → Tabs)
- params: visible 1-4 → 1; autoplay off|on → off; dots on|off → on

### skeleton
- id: `skeleton`
- en: Skeleton
- ko: 스켈레톤
- aliases: en: "gray loading boxes", "placeholder shapes while loading", "like Facebook loading", "shimmer thing"; ko: "로딩할 때 회색 박스", "내용 자리만 보여 주는", "페이스북 로딩처럼", "반짝이는 로딩"
- category: component
- when: Content takes 300ms–3s to load and its shape is known in advance.
- defaults: gray blocks matching the final layout, 1.5s shimmer, replaced in place with no layout shift; container `aria-busy="true"` plus a visually hidden "Loading" status, shimmer off under `prefers-reduced-motion`; same breakpoints as the loaded layout
- avoid: Skeletons for loads under 300ms (flash) or over 5s (use progress text).
- confusable: Toast (a message or a placeholder? → Toast for a message); Smooth Transition (loading or a state change? → Smooth Transition for a state change)
- params: shimmer on|off → on; min_ms 0-500/100 → 200 ms

## Effect

### hover-effect
- id: `hover-effect`
- en: Hover Effect
- ko: 호버 이펙트
- aliases: en: "something happens when the mouse is over it", "cards that react", "lifts up on hover", "highlight when pointing at it"; ko: "마우스 올리면 반응하는", "카드가 살짝 뜨는", "가리키면 강조되는", "올렸을 때 변하는 거"
- category: effect
- when: Clickable cards, buttons or links need affordance on pointer devices.
- defaults: 2–4px lift or 1.02 scale plus shadow, 150–200ms ease-out; same style on `:focus-visible`, never the only cue that something is interactive, no hover-only content; only under `@media (hover: hover)`
- avoid: Hover-revealed buttons that touch users can never reach.
- confusable: Micro-interaction (pointer presence or a completed action? → Micro-interaction for an action); Smooth Transition (hover or a state change? → Smooth Transition for a state change)
- params: lift 0-8 → 2 px; ms 100-400/50 → 150 ms; focus same|none → same

### scroll-reveal
- id: `scroll-reveal`
- en: Scroll Reveal
- ko: 스크롤 리빌
- aliases: en: "things appear as you scroll down", "fade in when they come into view", "sections slide up while scrolling", "animated on scroll"; ko: "스크롤하면 나타나는", "내려가면서 하나씩 보이는", "스크롤에 맞춰 올라오는", "내릴 때 애니메이션"
- category: effect
- when: A long marketing page whose sections should feel introduced one by one.
- defaults: IntersectionObserver at 20% visibility, fade plus 16px rise over 400–600ms, runs once; content present in DOM and readable without JS, no motion under `prefers-reduced-motion`; shorter rise and 10% threshold on mobile
- avoid: Hiding above-the-fold content until it "reveals".
- confusable: Stagger (one block, or siblings in sequence? → Stagger for siblings); Parallax (appears once, or moves continuously with scroll? → Parallax for continuous)
- params: threshold 10-50/10 → 20 %; ms 300-800/100 → 500 ms; rise 0-32/8 → 16 px; once on|off → on

### stagger
- id: `stagger`
- en: Stagger
- ko: 스태거
- aliases: en: "one after another", "items appear in sequence", "little delay between each", "cascade in"; ko: "하나씩 차례로", "순서대로 나타나는", "약간씩 시간차로", "줄줄이 등장하는"
- category: effect
- when: A list or grid enters and its items should read as a group with rhythm.
- defaults: 50–80ms delay per item, each 300ms fade plus rise, delay capped after 8 items so the total stays under 1s; all items in DOM immediately, off under `prefers-reduced-motion`; 30ms delay on mobile
- avoid: Long lists where the last item waits seconds.
- confusable: Scroll Reveal (siblings in sequence, or one block? → Scroll Reveal for one block); Carousel (all enter, or one at a time? → Carousel)
- params: step 40-120/20 → 60 ms; ms 200-500/50 → 300 ms; cap 6-12 → 8

### smooth-transition
- id: `smooth-transition`
- en: Smooth Transition
- ko: 스무스 트랜지션
- aliases: en: "not so abrupt", "fade between states", "animate the change", "make it glide"; ko: "뚝 바뀌지 않게", "부드럽게 바뀌는", "변할 때 자연스럽게", "스르륵 바뀌게"
- category: effect
- when: A visible state change (open/close, filter, theme, route) would otherwise jump.
- defaults: 200–300ms ease-in-out on opacity, transform and color only, reversible; focus moves with the change, instant under `prefers-reduced-motion`; same durations on mobile
- avoid: Transitioning layout properties (width, height, top) that cause jank.
- confusable: Micro-interaction (a view change, or feedback on one tiny action? → Micro-interaction for an action); Skeleton (loading? → Skeleton)
- params: ms 150-400/50 → 200 ms; easing ease-out|ease-in-out|spring → ease-out

### glassmorphism
- id: `glassmorphism`
- en: Glassmorphism
- ko: 글래스모피즘
- aliases: en: "frosted glass look", "see-through panel", "blurry background card", "the iOS blur style"; ko: "유리 느낌", "뒤가 비치는 패널", "흐릿한 반투명 카드", "iOS 블러 스타일"
- category: effect
- when: A floating panel (header, card, Modal) sits over colorful content and should feel layered.
- defaults: `backdrop-filter: blur(12–20px)`, 60–80% white or dark fill, 1px light border, at most two glass layers; text contrast ≥4.5:1 over the busiest background, solid fallback where `backdrop-filter` is unsupported; blur reduced to 8px on mobile
- avoid: Glass on glass, or body text on glass over a photo.
- confusable: Modal (a surface style or a component? → Glassmorphism styles a component, it is not one); Parallax (depth from blur or from motion? → Parallax for motion)
- params: blur 8-24/4 → 12 px; opacity 50-90/10 → 70 %; border on|off → on

### parallax
- id: `parallax`
- en: Parallax
- ko: 패럴랙스
- aliases: en: "background moves slower than the front", "depth when scrolling", "layers moving at different speeds", "3D-ish scrolling"; ko: "배경이 천천히 움직이는", "스크롤할 때 입체감", "앞뒤가 다른 속도로 움직이는", "깊이감 있는 스크롤"
- category: effect
- when: A hero or story section wants depth from 2–3 layers.
- defaults: background at 0.3–0.5× scroll speed via `transform: translateY`, max 3 layers, hero or one story section only; no text in moving layers, off under `prefers-reduced-motion`; static image on mobile
- avoid: Parallax on every section or on text.
- confusable: Scroll Reveal (continuous motion tied to scroll, or a one-time entrance? → Scroll Reveal for entrance); Scroll Snap (motion or paging? → Scroll Snap for paging)
- params: speed 0.2-0.6/0.1 → 0.4; layers 1-3 → 2; mobile still|on → still

### scroll-snap
- id: `scroll-snap`
- en: Scroll Snap
- ko: 스크롤 스냅
- aliases: en: "scroll stops at each section", "full-page sections", "snaps into place", "one screen at a time"; ko: "스크롤하면 섹션마다 멈추는", "한 화면씩 넘어가는", "딱딱 걸리는 스크롤", "페이지 단위로 넘김"
- category: effect
- when: A presentation-like page or a horizontal gallery where each item should align after scrolling.
- defaults: `scroll-snap-type: y mandatory` (`x` for galleries) with `scroll-snap-align: start`, sections sized to the viewport; `proximity` when a section can exceed the viewport, keyboard and wheel scrolling untouched; `proximity` or off on mobile
- avoid: Mandatory snap on sections taller than the viewport (content becomes unreachable).
- confusable: Carousel (free scroll, or buttons and dots? → Carousel for buttons); Parallax (paging or depth? → Parallax for depth)
- params: axis y|x → y; align start|center → start; strictness mandatory|proximity → proximity

### micro-interaction
- id: `micro-interaction`
- en: Micro-interaction
- ko: 마이크로 인터랙션
- aliases: en: "a little animation when I click", "the heart bounces", "button does something when pressed", "small feedback"; ko: "누르면 살짝 반응하는", "하트가 톡 튀는", "버튼 눌렀을 때 작은 효과", "작은 피드백"
- category: effect
- when: One small action (like, toggle, add to cart, copy) needs instant feedback.
- defaults: 100–300ms scale or color change plus optional icon swap, triggered by the action, not by hover; state also announced via `aria-pressed` or an `aria-live` text, off under `prefers-reduced-motion`; same on touch (tap-triggered)
- avoid: Feedback longer than 300ms or that blocks the next action.
- confusable: Hover Effect (pointer presence or a completed action? → Hover Effect for presence); Smooth Transition (one tiny action or a view change? → Smooth Transition for a view change)
- params: ms 100-300/50 → 150 ms; feedback scale|color|both → scale
