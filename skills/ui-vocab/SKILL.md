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

Read `terms.md` (in this skill's folder) before step 2: 25 term cards; `id` = the value sent in `ui`. Worked examples: `examples.md`.
Ids (nothing else is accepted): hero-section, responsive-layout, card-layout, bento-grid, sidebar-layout, sticky-header, split-layout, tabs, accordion, modal, drawer, bottom-sheet, dropdown, tooltip, toast, carousel, skeleton, hover-effect, scroll-reveal, stagger, smooth-transition, glassmorphism, parallax, scroll-snap, micro-interaction.
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
7. Build from it. Each line is final: never swap its term. Listed params override the card defaults; unlisted keys keep them. The card's `defaults` are the behavior/a11y/responsive checklist for every line. A quoted note is the person's instruction for that row. A later message `ui-picker: change` lists only the rows to redo: redo those, keep the rest.
8. A prompt typed while the plan is still in the pane arrives with a context block starting `ui-picker: a plan is pending` / `ui-picker: 패널에 확인 대기 중인 계획` (the rows as they stand). Nothing is confirmed by it. A question or an unrelated prompt: answer it, leave the plan. A change to the UI or a go-ahead: call `ui_pick` once more with the whole amended plan (rows the person already picked as decided ids; new areas may ask) and end with `Check the right pane.`; the person confirms there with Enter. Never build from that block.

## Messages

Build (user message after Enter in the pane):

```
ui-picker: build
- <area>: <En term>[ (tag)][ · <key> <value><unit>]…[ · "<note>"]
```

Header English in both languages; term names English; keys English. Tags: `(your pick)` / `(네 선택)` the person answered; `(recommended)` / `(추천 적용)` Esc or a typed prompt resolved the question; `(changed)` / `(변경)` a model-decided row the person edited (not added to picked or recommended rows). Params appear only when they differ from the card default. Bakery after the person picked Card Layout, set cols 4 and gap 16, lift 4 and a note:

```
ui-picker: build
- 상단 내비게이션: Sticky Header
- 상단 영역: Hero Section
- 빵 메뉴: Card Layout (네 선택) · cols 4 · gap 16px
- 메뉴 카드: Hover Effect (변경) · lift 4px · "그림자도 살짝"
```

Change (user message after Enter on `Send changes` once the build turn ended): header `ui-picker: change`, then only the rows whose term, params or note differ from the last message.

Pending block (beside a prompt typed while the plan is in the pane; an unanswered question shows its recommended id, untagged):

```
ui-picker: a plan is pending in the pane; the person has not confirmed it:
- <area>: <En term>[ (tag)]…
If this prompt is a question or unrelated, answer it and leave the plan in the pane. If it changes or approves this UI plan, call ui_pick once more with the whole amended plan (the rows above as decided ids) and end the turn with "Check the right pane."; the person confirms there with Enter. Do not build from this block.
```

ko header: `ui-picker: 패널에 확인 대기 중인 계획이 있습니다 (아직 확정 아님):`.

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
- Deny starting `ui-picker: pane not placed` → relay that line once per session; build with every array's first id and the card defaults.
- Deny starting `ui-picker: requires`, or the tool absent → say once that the picker is disabled in this environment; build with every array's first id and the card defaults; print the plan first as a Markdown table:

  | area | term | params |
  |---|---|---|

## Turn rule

Never build in the turn that called `ui_pick` and got `review: true`. That turn ends with `Check the right pane.` Building starts only in the turn that receives `ui-picker: build`; a pending block never starts one. After a `still pending` / `under review` deny, wait. After any other deny there is nothing to wait for: continue in the same turn.
