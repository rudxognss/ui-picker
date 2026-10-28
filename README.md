# ui-picker

Claude Code plugin. Before it builds any UI, it names every area with one of 25 UI terms, asks you only where two patterns genuinely fit, and shows each candidate as an animated preview in a side pane. You press a digit, edit a number if you like, press Enter. The model builds from a one-screen spec you approved.

Any language. Ask in Korean, the pane is Korean. Ask in Japanese, the pane is Japanese: English and Korean text is built in, every other language is supplied by the model in the same call, with English as the fallback for anything missing.

![25 UI patterns, each as an animated preview](docs/previews.gif)

## Why

- Vibe coders describe UI in words like "the thing that slides out from the side". The model guesses. ui-picker maps that to **Drawer**, with its default behavior, keyboard rules and mobile fallback, and shows you what it means before writing code.
- It asks only when the choice changes structure (Card Layout vs Bento Grid vs Carousel). Conventional areas (top navigation, loading state) are decided for you and listed, not asked.
- Every decision becomes one line the model cannot reinterpret: `- 빵 메뉴: Card Layout (your pick) · cols 4 · gap 16px`.
- The pane speaks whatever language you asked in. Term names are localized too (드로어, ドロワー, 抽屉); the build message keeps the English term so the code is the same everywhere.

## Install

Inside Claude Code (2.1.303 or later, terminal):

```
/plugin install ui-picker --marketplace rudxognss/ui-picker
```

Confirm with `y`, then Enter. Shell form: `claude plugin install ui-picker --marketplace rudxognss/ui-picker`. No restart needed.

## Try it

```
빵집 사이트 하나 만들어보자
포트폴리오 사이트도 하나 만들어줘. 프로젝트 목록 부분은 멋지게.
Build a settings page with some kind of popup for delete confirmation
```

What happens, from a real session:

```
❯ 포트폴리오 사이트도 하나 만들어줘. 프로젝트 목록 부분은 멋지게.

⏺ ui-picker - ui_pick (MCP)(title: "포트폴리오 사이트", ui: {
    "상단 내비게이션": "sticky-header",
    "자기소개 첫 화면": "hero-section",
    "프로젝트 목록": ["bento-grid", "card-layout", "carousel"],   ← asked
    "프로젝트 카드": "hover-effect",
    "소개 / 경력": "split-layout",
    "섹션 등장 효과": "scroll-reveal",
    "전체 레이아웃": "responsive-layout" })
  ⎿  { "review": true, "questions": 1 }

⏺ 오른쪽 패널을 확인하세요.
```

The pane shows question 1/1 with three animated previews over hotkeys `1` `2` `3`, then a review board of all seven rows (thumbnail, pattern, who decided it, editable numbers). Enter sends:

```
ui-picker: build
- 상단 내비게이션: Sticky Header
- 자기소개 첫 화면: Hero Section
- 프로젝트 목록: Card Layout (네 선택)
- 프로젝트 카드: Hover Effect
- 소개 / 경력: Split Layout
- 섹션 등장 효과: Scroll Reveal
- 전체 레이아웃: Responsive Layout
```

and the model builds exactly that. `/ui-picker` reopens the board afterwards; edit a row and Enter sends only the changed lines as `ui-picker: change`.

## The 25 terms

| Layout | Component | Effect |
|---|---|---|
| Hero Section | Tabs | Hover Effect |
| Responsive Layout | Accordion | Scroll Reveal |
| Card Layout | Modal | Stagger |
| Bento Grid | Drawer | Smooth Transition |
| Sidebar Layout | Bottom Sheet | Glassmorphism |
| Sticky Header | Dropdown | Parallax |
| Split Layout | Tooltip | Scroll Snap |
| | Toast | Micro-interaction |
| | Carousel | |
| | Skeleton | |

Each term card ([skills/ui-vocab/terms.md](skills/ui-vocab/terms.md)) carries: plain-language aliases in both languages ("옆에서 쓱 나오는", "slides out from the side"), when it fits, default behavior + accessibility + responsive rules the build must follow, the numbers you can edit in the pane, what to avoid, and the neighbor term it is confused with.

## How it works

1. **Plan.** A UI request activates the `ui-vocab` skill. The model lists every area in page order as `area -> term id`. Stated or conventional areas get one id; an area where 2-4 patterns fit gets an array, recommended first (max 3 questions).
2. **Pick.** One `ui_pick` call. The pane asks each question with every candidate animating at once; a digit picks. Esc applies the recommendations.
3. **Review.** Every row shows its thumbnail, term, source tag (`model`, `your pick`, `recommended`, `changed`) and its numbers as selects. `1`-`9` opens a row, `x` swaps the pattern, `r` resets.
4. **Build.** Enter sends the plan as a user message. The pane closes; the model builds. Terms are final, numbers override defaults, a quoted note is your instruction.
5. **Change.** `/ui-picker` reopens the board. Edited rows go out as `ui-picker: change`.

Full protocol, keys, message formats, preview internals and the live checklist: [docs/reference.md](docs/reference.md).

## Where it works

| Surface | Pane + questions | Skill only (defaults + table in chat) |
|---|---|---|
| Claude Code CLI in a terminal, ≥144 columns | yes | |
| Narrower terminal | run `/ui-picker` once to place the pane | |
| Claude Code Desktop, VS Code panel, `claude -p`, SDK | | yes |

Previews render as PNG frames in kitty-graphics terminals (Ghostty, kitty, WezTerm, Orca) and as colored cell art everywhere else. Tested in Orca 1.4 on macOS.

## Limitations

- Early-access mod API (`hooks.json` modules); may change between Claude Code releases.
- One `ui_pick` per request, 1-9 areas, max 3 questions, 2-4 candidates each.
- Languages other than English and Korean cost extra tokens per call (the model sends the pane text), and their quality is the model's translation.
- Editable numbers are the fixed `params` of each term card; free text goes in the note.
- Sends nothing anywhere. State lives in the plugin's session store.

## Develop

```sh
command claude plugin validate .
command claude plugin test .          # 121 tests
bun scripts/render-previews.ts --check   # PNG frames up to date
```

## License

MIT
