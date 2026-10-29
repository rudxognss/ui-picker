# ui-picker reference

Protocol details, keys, messages, preview internals and the live checklist. The short version is in [README.md](../README.md).

## How it works

1. Plan. A request that builds or changes UI activates the `ui-vocab` skill. The model lists every UI area in page order as `area -> term id` (25 ids in `skills/ui-vocab/terms.md`): stated or conventional areas get one id; an area where 2-4 patterns fit and the choice changes structure gets an array, recommended first (max 3 arrays). Numbers the request fixes ("3 per row") go in `params`.
2. Pick. One `ui_pick` call, then the model ends its turn with `Check the right pane.` (ko `오른쪽 패널을 확인하세요.`). The pane asks question i/n: every candidate animates large (3:2, as wide as the pane allows), stacked, each over its hotkey `1`-`4`, caption, when-line and default chips; the pane scrolls when the stack is taller than it. Esc gives the remaining questions their recommended id.
3. Review / edit. Every decision is a row: thumbnail, area, pattern name, source tag (`[model]`, `[your pick]`, `[recommended]`, plus `[changed]` once edited), chips. `1`-`9` opens a row: one Select per number (columns, gap, duration, ...), a note Input, `x` swaps the pattern for one of its alternatives, `r` resets the row. Zero questions still stop here.
4. Enter (or `0`) on `Build` sends the plan as a user message `ui-picker: build` and closes the pane: it is only on screen while a decision is yours to make.
5. Build. The model builds from that message: terms are final, listed params override the card defaults, a quoted note is your instruction.
6. Done. `/ui-picker` reopens the plan; once the model's turn ended it shows `Built`. Edit rows again and Enter on `Send changes` sends `ui-picker: change` with only the rows that differ and closes the pane again.

A prompt typed while the plan is in the pane never confirms it. The plan travels beside your prompt as a context block (`ui-picker: a plan is pending in the pane; the person has not confirmed it:` + the rows + what the model may do), the pane stays, nothing is built:
- a question ("how do I reopen the pane?") gets an answer; the plan waits where it was;
- a change ("make the menu cards, add a footer") or a go-ahead ("go on") makes the model call `ui_pick` once more with the whole amended plan (your picks kept as decided ids); the pane shows the new plan and you confirm it with Enter.
Until you have typed something, a second `ui_pick` is a re-ask and is denied; once you have, it replaces the plan.

### Keys

| key | asking | review | swapping | done |
|---|---|---|---|---|
| `1`-`9` | pick option 1-4 | open / close row | pick the alternative | open / close row |
| Enter | focused Button | `Build` (focused by default); inside a row: Select pick, note save | focused Button | `Send changes` |
| `0` | — | `Build` | — | `Send changes` |
| `x` / `r` | — | swap / reset (open row) | `x` keeps the current pattern | swap / reset |
| Tab, arrows | move focus | move focus; arrows inside a focused Select | move focus | move focus |
| Esc | rest → recommended, then review | keys back to the prompt; pane and edits stay | same as review | same as review |
| typed digit in the prompt | counts as that pick | dropped with a pointer to the pane | dropped | — |

While building the rows are read-only (`1`-`9` toggles the large thumbnail). Hotkeys reach the pane only while it holds the keyboard; a focused note Input swallows printable keys (Tab or Esc leaves it).

### Messages

Build (user message after Enter; header, term names and keys are English in both languages; params listed only when they differ from the card default):

```
ui-picker: build
- <area>: <En term>[ (tag)][ · <key> <value><unit>]…[ · "<note>"]
```

Tags: `(your pick)` / `(네 선택)` you answered; `(recommended)` / `(추천 적용)` Esc or a typed prompt resolved it; `(changed)` / `(변경)` a model-decided row you edited. Example (bakery, after picking Card Layout, cols 4, gap 16, lift 4 and a note; in `ko` the tags read `(네 선택)`, `(추천 적용)`, `(변경)`):

```
ui-picker: build
- top navigation: Sticky Header
- top section: Hero Section
- bread menu: Card Layout (your pick) · cols 4 · gap 16px
- menu cards: Hover Effect (changed) · lift 4px · "a soft shadow too"
```

Change (from done): header `ui-picker: change`, then only the rows that differ from the last message.

Review overlay (`skills/ui-vocab/review.js`, copied next to an HTML draft as `ui-picker-review.js`): the person clicks an element, writes a note, and copies `ui-picker: change` with note-only lines `- <area>: "<note>"[ · <element>]`. `<area>` is the clicked element's nearest `data-area`, else the nearest heading text, else `tag#id`/`tag.class`. A note-only line keeps the row's term and params. Notes persist in `localStorage` per path; the pane is not involved.

Context block (beside a prompt typed while the plan is pending): header `ui-picker: a plan is pending in the pane; the person has not confirmed it:` / `ui-picker: 패널에 확인 대기 중인 계획이 있습니다 (아직 확정 아님):`, the same lines (an unanswered question shows its recommended id, untagged), then one line telling the model to answer a question or re-plan a change, never build.

### Esc rule

- Asking: Esc resolves the remaining questions as recommended and moves the plan to review. The pane stays.
- Review, swapping, building, done: Esc returns the keyboard to the prompt; the pane and your edits stay.
- Closing the pane (close mark, ctrl+x x) never sends anything. `/ui-picker` reopens it with the pending question or the plan.

## Previews

- 25 scenes, one per term id, drawn pixel-native at 240x160 design units (`hooks/previews/scenes/{layout,component,effect}.ts`).
- Image terminals: 480x320 indexed PNG frames (4-bit when ≤16 colors, else 8-bit), 40 slots per 4 s loop (100 ms each), phases idle → trigger → enter → hold → exit → rest; the hold frame (slot 20) is the static picture. Frames are byte-deduplicated into `hooks/previews/png-frames.ts` plus two pool modules `png-pool-a.ts` and `png-pool-b.ts` (generated; ≤4 KB per frame, ≤30 KB per id, each file under 256 KiB).
- Other terminals: the same scene rendered to quadrant-block cell art (`▘▝▖▗▀▄▌▐▚▞▙▛▜▟█`, two colors per cell), labels overlaid as text when the box is ≥20 columns wide.
- Asking and swapping draw every candidate large (16 to 160 columns, 3:2; width = body − 2), stacked and all animating; arrows scroll the stack. The palette is high-contrast dark (page #1b1d2b, surfaces #3b4160, lines #7f88ad); page titles are drawn at 3 units per font dot, labels inside components at 2.
- Regenerate after editing a scene: `bun scripts/render-previews.ts` rewrites `png-frames.ts` and the pools and prints a table (id, unique frames, bytes, bit depth). `bun scripts/render-previews.ts --check` exits 1 when the file is stale (CI). `bun scripts/render-previews.ts --only drawer,modal --out /tmp/frames` writes `<id>-<slot>.png` for every slot to inspect a scene without touching the module.

## What the hooks read and add

- `prompt.compose`: adds a short `ui-picker:rules` section (session scope, cached) to every request whose tool list includes `mcp__ui-picker__ui_pick`; `/context` lists it.
- `prompt.submit` (composer and bridge prompts; not commands, meta or plugin prompts):
  - adds one model-only context line (`ui-picker: UI request. Apply ui-vocab: call ui_pick once ...`) when the prompt contains a UI or product noun (page, screen, button, menu, settings, card, layout, landing, dashboard, modal, drawer, navbar, sidebar, hero, UI, UX, app, website, site, kiosk, frontend; 화면, 페이지, 버튼, 메뉴, 설정, 카드, 레이아웃, 랜딩, 대시보드, 모달, 드로어, 사이드바, 히어로, 앱, 웹사이트, 사이트, 키오스크, 프론트) and does not talk about the mod itself (META guard: `ui-picker`, `ui_pick`, `ui-vocab`, `mcp__`, a quoted tool result);
  - while a plan is in the pane: a bare digit is the pick; any other prompt carries the pending plan as a context block (`ui-picker: a plan is pending ...`), marks the plan `prompted` and adds nothing else; the pane stays.
- `tool.call` `mcp__ui-picker__ui_pick`: validates, opens the pane, returns `{"review":true,"questions":n}` (plus `"pane": "not placed (...)"` when the host refused an unasked open below its width floor: the plan is kept, the model runs `skills/ui-vocab/preview.sh` which opens `preview.html#q=...` (frames in `preview-frames-a.js` and `preview-frames-b.js`, generated by `bun scripts/build-preview-html.ts`) in the browser for the animated candidates, typed digits answer, `/ui-picker` places the pane); denies with a field line, `still pending` / `under review` (a pending plan nobody typed over since), `pane not placed` or the disabled line. A pending plan the person typed over is replaced.
- `ui.close` by you while asking: refused; the plan moves to review. The mod closes the pane itself once a plan or change message went out.
- `turn.start` of the main loop while building stamps the build turn; that turn's `turn.complete` moves building → done (the turn that called `ui_pick` may still be running when Enter is pressed and never counts). No status is sent on the wire.
- `session.end` with reason `clear`: the pane state is reset and the pane closed, so the fresh conversation can plan again.
- Sends nothing anywhere. Writes the plugin's session state (`ui-picker.pane`) and a mirror of it in the plugin's own store (`pane`, tagged with the session id): `/ui-picker`, `ui_pick` and a typed prompt read the mirror back when the session state comes up empty (seen once after a pane was closed by hand). Another session's mirror is ignored.

## Limitations

- Early-access API; may change between Claude Code releases.
- One tool (`ui_pick`), one call per request; 1-9 areas; max 3 questions; 2-4 candidates each.
- Language: `lang` is any BCP-47 code. `en` and `ko` have built-in pane text; any other code reads the call's `labels` (`ui` strings by key, `terms` by id: name/when/caption/params) and falls back to English per string. The build message keeps English term names and keys in every language.
- Editable numbers are the fixed `params` list of each term card (every value is one of the card's steps); free text goes in the note.
- Pane, tool and `/ui-picker`: interactive terminal only. The `ui-vocab` skill applies on every surface (defaults + table, no questions).
- When the host refuses to place the pane (an unasked open in a terminal narrower than 144 columns), `ui_pick` still keeps the plan and tells the model to ask in chat; typed digits answer, and `/ui-picker` (a user-asked open) places the pane at any width.
- If the build or change message cannot enter (a settings hook blocks it, a Stop stands), the text is put in the prompt box with a toast; press Enter to send it.

## Live checklist

Run in a clean `CLAUDE_CONFIG_DIR` with the plugin installed from the marketplace, Claude Code 2.1.303 or later, a kitty-graphics terminal at 144 columns or wider. Last full pass: 2026-10-28, Orca 1.4, Claude Code 2.1.312.

- [x] `Build a bakery website. Make the menu section look nice.` → one `ui_pick` call with `lang: "en"`, the menu section asked with 4 candidates, the turn ends with `Check the right pane.`; the pane shows `Question 1 of 1` and every candidate animating at once.
- [x] A zero-question plan opens at review and Enter sends a build message with no tags.
- [x] Digit `2` picks; the review board tags the row `[your pick]`; Enter on `Build` sends `ui-picker: build` with one line per row and the pick's non-default numbers.
- [x] The model builds in that turn without calling `ui_pick` again; the pane closes; `/ui-picker` reopens it as `Built`.
- [x] Open a row, change a number with the Select, Enter → the row reads `[changed]` and focus returns to the row button.
- [x] A Korean request (`빵집 사이트 하나 만들어보자`) gets a Korean pane with `lang` inferred from Hangul; a Japanese request gets a Japanese pane from the model's `labels`, tags included (`[あなたの選択]`).
- [x] `claude -p` (no pane): the skill prints the plan as a table and builds with the recommendations.
- [ ] Esc path: a 2-question set, answer one, press Esc → the other row is `[recommended]`, the pane stays in review.
- [ ] Question mid-plan: with a question open, ask `how do I reopen the pane?` → the model answers, builds nothing, the question stays.
- [ ] Change mid-plan: type a change instead of pressing Enter → the model calls `ui_pick` again (accepted), the pane shows the new plan.
- [ ] Close the pane by hand, then `/ui-picker` → the pending question or the plan is back (store mirror).
- [ ] `/clear` with a plan pending → the next UI request plans afresh.
- [ ] Terminal under 144 columns without `/ui-picker` → the model opens `preview.html` in the browser and lists the question in chat; a typed digit answers; `/ui-picker` shows the pane with the pending plan.
