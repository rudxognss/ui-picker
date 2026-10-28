---
name: ui-vocab
description: >-
  Ask-only-when-ambiguous UI decision protocol: plan every UI area of a request as a term id, decide conventional
  ones yourself, and ask the user (max 3 areas, animated previews in the ui-picker pane) only where 2-4 patterns
  fit and the choice changes structure. One tool call per request (`ui_pick`), then end the turn; the person
  reviews and edits the plan in the pane and it returns as a "ui-picker: build" message. Use for any request that
  builds or changes UI (page, screen, component, layout, effect), even without design words. Trigger phrases en:
  "make it nice", "make it look good", "some kind of popup", "slide out", "fancy", "modern looking"; ko: "멋지게",
  "보기 좋게", "쓱 나오는", "팝업 같은", "세련되게", "예쁘게".
---

# ui-vocab

The 25 term ids (nothing else is accepted), what each fits and the numbers the person can edit:

| id | category | fits when | params (choices or range → default, unit) |
|---|---|---|---|
| `hero-section` | layout | A landing page opens with one message and one primary action above the fold. | ctas 1, 2 → 1; media right, background, none → right; stack 640, 768, 1024 → 768 px |
| `responsive-layout` | layout | The same page must work on phones, tablets and desktops. | cols 2-6 → 3; md 1-4 → 2; sm 1, 2 → 1; bp_md 1024, 1280 → 1024 px; bp_sm 640, 768 → 768 px |
| `card-layout` | layout | Many items of the same kind, each with image, title and one line of text. | cols 2-6 → 3; md 1-4 → 2; sm 1, 2 → 1; gap 8-48/4 → 24 px |
| `bento-grid` | layout | A feature or highlights section with items of unequal importance. | cols 3, 4, 6 → 4; feature 2x2, 2x1, 3x2 → 2x2; gap 8-32/4 → 16 px |
| `sidebar-layout` | layout | An app with 4+ sections the user switches between often (dashboard, admin, docs). | width 200-320/20 → 260 px; md rail, hidden → rail; sm drawer, hidden → drawer |
| `sticky-header` | layout | Top navigation or a primary action must stay reachable on a long page. | height 48-80/4 → 64 px; shadow on, off → on; mobile logo+menu, full → logo+menu |
| `split-layout` | layout | Two equal partners: text beside media, form beside preview, login beside artwork. | ratio 50/50, 60/40, 40/60 → 50/50; gap 24-64/8 → 48 px; mobile media-first, text-first → media-first |
| `tabs` | component | 2–6 peer views of one object, one visible at a time, on one page. | indicator underline, pill → underline; mobile scroll, dropdown → scroll |
| `accordion` | component | Long content in independent sections the user scans and opens selectively (FAQ, settings groups). | multi on, off → on; ms 150-300/50 → 200 ms; icon chevron, plus → chevron |
| `modal` | component | The user must finish or dismiss one task before returning (confirm, short form, critical notice). | width 400-720/40 → 560 px; backdrop dim, blur → dim; full_below 480, 640, none → 640 px |
| `drawer` | component | Secondary content or settings that must not leave the current page. | side right, left → right; width 320-480/40 → 400 px; mobile full, same → full |
| `bottom-sheet` | component | Touch-first options or details that keep the page visible behind them. | snaps 50/90, 40/90, 90 → 50/90; handle on, off → on; desktop modal, same → modal |
| `dropdown` | component | One choice from 4–15 options, or a short action menu behind one button. | align start, end → start; max_items 5-12 → 8; ms 100-200/50 → 150 ms |
| `tooltip` | component | A short, non-essential label or hint for an icon or truncated text. | delay 0-700/100 → 300 ms; side top, bottom, auto → top; touch off, on → off |
| `toast` | component | Confirming a completed action or a non-blocking status change. | pos top-right, bottom-center, bottom-right → top-right; ms 3000-8000/1000 → 4000 ms; stack 1-5 → 3 |
| `carousel` | component | A sequence of visual items in limited space where one at a time is acceptable (gallery, testimonials). | visible 1-4 → 1; autoplay off, on → off; dots on, off → on |
| `skeleton` | component | Content takes 300ms–3s to load and its shape is known in advance. | shimmer on, off → on; min_ms 0-500/100 → 200 ms |
| `hover-effect` | effect | Clickable cards, buttons or links need affordance on pointer devices. | lift 0-8 → 2 px; ms 100-400/50 → 150 ms; focus same, none → same |
| `scroll-reveal` | effect | A long marketing page whose sections should feel introduced one by one. | threshold 10-50/10 → 20 %; ms 300-800/100 → 500 ms; rise 0-32/8 → 16 px; once on, off → on |
| `stagger` | effect | A list or grid enters and its items should read as a group with rhythm. | step 40-120/20 → 60 ms; ms 200-500/50 → 300 ms; cap 6-12 → 8 |
| `smooth-transition` | effect | A visible state change (open/close, filter, theme, route) would otherwise jump. | ms 150-400/50 → 200 ms; easing ease-out, ease-in-out, spring → ease-out |
| `glassmorphism` | effect | A floating panel (header, card, Modal) sits over colorful content and should feel layered. | blur 8-24/4 → 12 px; opacity 50-90/10 → 70 %; border on, off → on |
| `parallax` | effect | A hero or story section wants depth from 2–3 layers. | speed 0.2-0.6/0.1 → 0.4; layers 1-3 → 2; mobile still, on → still |
| `scroll-snap` | effect | A presentation-like page or a horizontal gallery where each item should align after scrolling. | axis y, x → y; align start, center → start; strictness mandatory, proximity → proximity |
| `micro-interaction` | effect | One small action (like, toggle, add to cart, copy) needs instant feedback. | ms 100-300/50 → 150 ms; feedback scale, color, both → scale |

This table is enough to plan. `terms.md` in this skill's folder holds the full cards (plain-language aliases in both languages, defaults, avoid, confusable neighbors): read it only when an alias or a close call needs it, or when building (its `defaults` line per term is the build checklist). Worked examples: `examples.md`.
Tool (registered by the ui-picker mod, terminal only): `mcp__ui-picker__ui_pick`. The mod owns names, when-lines, chips and previews; the model sends ids and numbers only.

## Protocol

1. Extract areas: every UI area the request needs (layout, components, effects), in page order. 1-9 areas; area names in the person's words and language, ≤40 chars, not integer-like (`"1"`).
2. Classify each area (rules in Question eligibility):
   - stated: the person named a term or alias from `terms.md` → that id.
   - default: convention gives one answer → that id.
   - ambiguous: 2-4 ids fit and the choice changes structure → ask.
3. Compose one call `{ title?, lang, ui, params?, labels? }`:
   - `ui`: `{ "<area>": "<id>" }` for decided areas, `{ "<area>": ["<id>", ...] }` (2-4 ids, no duplicates, recommended first) for asked ones. Insertion order = page order. Max 3 arrays: cut effect questions first, then component, then layout; a cut array becomes its first id.
   - `params`: `{ "<area>": { "<key>": <value> } }` only for numbers the request fixes ("3 per row" → `{"cols": 3}`), decided areas only, keys and values from the card's `params` line. Otherwise omit.
   - `title` ≤40 chars, in the person's language. `lang`: the language the person wrote in, as a code (`en`, `ko`, `ja`, `zh-TW`, `de`, ...). Omitted: `ko` when `title` or an area contains Hangul, else `en`.
   - `labels` only when `lang` is neither `en` nor `ko` (see Language).
4. Call `mcp__ui-picker__ui_pick` once. Result (JSON string): `{"review":true,"questions":<n>}`.
5. End the turn with exactly one line meaning `Check the right pane.` in the person's language (ko: `오른쪽 패널을 확인하세요.`, ja: `右のパネルを確認してください。`). Nothing else; do not build. Zero questions still stop at review: the person edits the numbers and presses Enter.
6. The spec arrives as the next user message starting `ui-picker: build`. Never re-ask; never call `ui_pick` again for the same request (the one exception is step 8).
7. Build from it. Each line is final: never swap its term. Listed params override the card defaults; unlisted keys keep them. The card's `defaults` are the behavior/a11y/responsive checklist for every line. A quoted note is the person's instruction for that row. A later message `ui-picker: change` lists only the rows to redo: redo those, keep the rest. A change line with no term (`- <area>: "<note>"[ · <part>]`) keeps the row's term and params and applies the note; `<part>` names the clicked element inside the row.
   - HTML drafts get the review overlay: put `data-area="<area>"` (the exact area name from the build message) on each row's root element, copy `review.js` from this skill's folder next to the HTML as `ui-picker-review.js`, add `<script src="ui-picker-review.js"></script>` before `</body>`, and tell the person in one line: open the HTML, click any part, write what to change, press "Copy for Claude", paste here. The person removes that script tag when the draft is final.
8. A prompt typed while the plan is still in the pane arrives with a context block starting `ui-picker: a plan is pending` / `ui-picker: 패널에 확인 대기 중인 계획` (the rows as they stand). Nothing is confirmed by it. A question or an unrelated prompt: answer it, leave the plan. A change to the UI or a go-ahead: call `ui_pick` once more with the whole amended plan (rows the person already picked as decided ids; new areas may ask) and end with `Check the right pane.`; the person confirms there with Enter. Never build from that block.

## Messages

Build (user message after Enter in the pane):

```
ui-picker: build
- <area>: <En term>[ (tag)][ · <key> <value><unit>]…[ · "<note>"]
```

Header, term names and keys are English in every language. Tags: `(your pick)` the person answered; `(recommended)` Esc or a typed prompt resolved the question; `(changed)` a model-decided row the person edited (not added to picked or recommended rows); in `ko` the tags read `(네 선택)` / `(추천 적용)` / `(변경)`, in other languages the `labels.ui` text. Params appear only when they differ from the card default. Bakery after the person picked Card Layout, set cols 4 and gap 16, lift 4 and a note:

```
ui-picker: build
- top navigation: Sticky Header
- top section: Hero Section
- bread menu: Card Layout (your pick) · cols 4 · gap 16px
- menu cards: Hover Effect (changed) · lift 4px · "a soft shadow too"
```

Change (user message after Enter on `Send changes` once the build turn ended): header `ui-picker: change`, then only the rows whose term, params or note differ from the last message.

The review overlay in an HTML draft produces the same header with note-only lines, pasted by the person:

```
ui-picker: change
- Menu section: "make the feature tile show a photo"
- Hero: "shorter headline" · p.lede "Fresh bread, baked at dawn"
```

Pending block (beside a prompt typed while the plan is in the pane; an unanswered question shows its recommended id, untagged):

```
ui-picker: a plan is pending in the pane; the person has not confirmed it:
- <area>: <En term>[ (tag)]…
If this prompt is a question or unrelated, answer it and leave the plan in the pane. If it changes or approves this UI plan, call ui_pick once more with the whole amended plan (the rows above as decided ids) and end the turn with "Check the right pane."; the person confirms there with Enter. Do not build from this block.
```

The header is localized the same way as the pane (ko: `ui-picker: 패널에 확인 대기 중인 계획이 있습니다 (아직 확정 아님):`).

## Question eligibility

Ask only when all hold:
- the person mentioned the area, or stood in for it with a vague aesthetic phrase from the trigger list ("make it nice",
  "make it look good", "fancy", "modern looking", "멋지게", "보기 좋게", "세련되게", "예쁘게"): attached to a named
  section → that section's pattern question (layout or component ids); attached to the whole page → at most one
  entrance-effect question composed from the effect ids that fit the page (e.g. scroll-reveal / stagger / parallax),
  dropped first under the cap;
- the pattern is not named (no term, no alias);
- 2+ cards in `terms.md` fit;
- the visual difference is obvious at a glance;
- changing it later changes structure, not just style.

Never ask when any holds:
- convention gives one answer (dashboard → sidebar-layout; top navigation → sticky-header; loading → skeleton);
- the person used a term or alias from `terms.md`;
- the difference is cosmetic (color, spacing, radius, type).

Cap: 3 questions per request. When cutting: drop effect questions first, then component, then layout; a dropped
question becomes its first id. Put the id convention favors for the person's context first.

## Language

The pane speaks the person's language. `title`, area names, notes and your chat lines are in it; ids stay ids; the build message keeps English term names and keys in every language.

- `en` and `ko`: the pane has built-in text. Send `lang` and nothing more.
- Any other language: send `labels` with the pane text in that language. Everything you leave out shows in English.

```
labels: {
  ui: { progress, pickPrompt, footerEsc, recommendedTag, sourceModel, sourceUser, sourceRecommended, changedTag,
        reviewHint, buildingHint, doneHint, swapPrompt, keep, current, build, sendChanges, save, note, notePlaceholder,
        swap, reset, decisions },
  terms: { "<id>": { name, when, caption, params: { "<key>": "<label>" } } }   // one entry per id in ui, candidates included
}
```

`ui` values are the English strings of `hooks/strings.ts` translated; keep the `{i}`, `{n}`, `{area}` placeholders. Term `name` is the localized name (ja `ドロワー`, zh `抽屉`); `when` and `caption` translate the card's when-line and the one-sentence preview caption; `params` translate the card's param keys (`cols` → `列`). Each string ≤160 chars. Your closing line is "Check the right pane." in the person's language.

## Failure handling

- Deny with a field line (`lang: expected a language code like en, ko, ja, zh-TW`, `labels.ui.<key>: unknown key`, `labels.terms.<id>: unknown id`, `labels.terms.<id>.params.<key>: unknown key`, `labels...: expected a string of at most 160 chars`, `ui: expected 1 to 9 areas, got <n>`, `ui: more than 3 questions`, `ui.<area>: area too long`, `ui.<area>: integer-like area names are not allowed`, `ui.<area>: unknown id "<id>"`, `ui.<area>: expected 2 to 4 candidates, got <n>`, `ui.<area>: duplicate id "<id>"`, `params.<area>: not a decided area`, `params.<area>.<key>: unknown key`, `params.<area>.<key>: expected one of <values>`) → fix the payload and call once more. Denied again → relay the line once, build with every array's first id and the card defaults.
- Deny starting `ui-picker: a question set is still pending` or `ui-picker: the plan is under review` → the person is still on an earlier plan and has not typed since. Do not ask again, do not build; end the turn with `Check the right pane.` and fold the new areas in when the `ui-picker: build` message arrives (or when a pending block arrives with their next prompt: then step 8 applies and `ui_pick` is accepted).
- Result with a `pane` field (`"pane": "not placed (...)"`): the plan is kept but the pane could not open on its own (terminal narrower than the host allows). The previews must still be seen, so open them in the browser: run `sh "<this skill's folder>/preview.sh" 'card-layout,bento-grid,carousel' en 'Bakery website'` (one group per question, `;` between questions, ids comma-separated, recommended first; the page speaks en or ko and falls back to English for other codes). The script writes a one-line launcher page in `$TMPDIR` and opens it, because macOS `open` drops a `#` from a file URL. Then write each question in chat as numbered candidates in the person's language (`1 Card Layout · 2 Bento Grid · 3 Carousel`), say that a typed digit answers and that `/ui-picker` opens the same previews in the terminal, then end the turn. Do not build.
- Deny starting `ui-picker: requires`, or the tool absent → say once that the picker is disabled in this environment; build with every array's first id and the card defaults; print the plan first as a Markdown table:

  | area | term | params |
  |---|---|---|

## Turn rule

Never build in the turn that called `ui_pick` and got `review: true`. That turn ends with `Check the right pane.` Building starts only in the turn that receives `ui-picker: build`; a pending block never starts one. After a `still pending` / `under review` deny, wait. After any other deny there is nothing to wait for: continue in the same turn.
