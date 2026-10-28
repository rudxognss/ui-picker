import type { EngineInterface, Frozen, RenderInputOf } from 'claude-code'
import type { Target } from './animate'
import { hasPng, imageRows, pngFrame } from './previews/images'
import { frame, hasPreview, HOLD_T } from './previews/index'
import type { Labels, Lang, Plan } from '../types'
import { answered, cursor, questions } from './state'
import { t } from './strings'
import { chipsOf, defaultsOf, nameOf, TERMS, textOf } from './terms'

export type PaneEvent = Frozen<RenderInputOf<'Pane', 'terminal'>>

/** One option: a term id and its Button label. */
export type Card = { id: string; label: string }
/** What the picker draws: the cursor question while asking, a synthetic one over `[term, ...alt]` while swapping. */
export type Ask = { lang: Lang; labels?: Labels; title?: string; area: string; progress?: string; prompt: string; cards: Card[]; cancel?: boolean }
export type AskHandlers = { pick: (i: number) => void; cancel: () => void }

const MIN_W = 16
const MAX_W = 160
const NO_PREVIEW = '(no preview)'

/** Every candidate's preview: as wide as the body allows, 3:2; the stack scrolls when it outgrows the pane. */
export function previewSize(e: PaneEvent): { W: number; H: number } {
  const W = Math.max(MIN_W, Math.min(e.props.bodyColumns - 2, MAX_W))
  return { W, H: imageRows(W, 6, 48) }
}

export function askOf(p: Plan, mode: 'asking' | 'swapping'): Ask | undefined {
  const row = mode === 'asking' ? cursor(p) : p.swapping
  const d = row === undefined ? undefined : p.decisions[row]
  if (!d) return undefined
  const ask: Ask =
    mode === 'asking'
      ? {
          lang: p.lang,
          area: d.area,
          progress: t(p, 'progress', { i: answered(p) + 1, n: questions(p) }),
          prompt: t(p, 'pickPrompt'),
          cards: (d.options ?? []).map((id, i) => ({ id, label: `${i + 1}: ${nameOf(id, p)}${i === 0 ? ' · ' + t(p, 'recommendedTag') : ''}` })),
        }
      : {
          lang: p.lang,
          area: d.area,
          prompt: t(p, 'swapPrompt', { area: d.area }),
          cards: [d.term, ...(TERMS[d.term]?.alt ?? [])].map((id, i) => ({ id, label: `${i + 1}: ${nameOf(id, p)}${i === 0 ? t(p, 'current') : ''}` })),
          cancel: true,
        }
  if (p.labels !== undefined) ask.labels = p.labels
  if (p.title !== undefined) ask.title = p.title
  return ask
}

function kindOf(id: string, images: boolean): Target['kind'] | undefined {
  if (images && hasPng(id)) return 'image'
  if (hasPreview(id)) return 'raster'
  return undefined
}

/** One target per candidate that has a preview: all of them animate at once. */
export function previewTargets(ask: Ask, e: PaneEvent, images: boolean): Target[] {
  const { W, H } = previewSize(e)
  const out: Target[] = []
  ask.cards.forEach((c, j) => {
    const kind = kindOf(c.id, images)
    if (kind) out.push({ key: 'preview-' + j, preview: c.id, W, H, kind })
  })
  return out
}

export function pickerTree($: EngineInterface, e: PaneEvent, ask: Ask, images: boolean, on: AskHandlers): JSX.Element {
  const { Box, Text, Button, Raster, Image } = $.ui.resolve(e)
  const { W, H } = previewSize(e)
  return (
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="column">
        <Text bold>{ask.title ?? ask.area}</Text>
        <Text dimColor>{[ask.progress, ask.prompt].filter(Boolean).join(' · ')}</Text>
      </Box>
      {ask.cards.map((c, j) => {
        const key = 'preview-' + j
        const kind = kindOf(c.id, images)
        const term = TERMS[c.id]
        return (
          <Box flexDirection="column">
            {kind === 'image' ? (
              <Image key={key} source={{ png: pngFrame(c.id, HOLD_T) }} columns={W} rows={H} alt={nameOf(c.id, ask)} />
            ) : kind === 'raster' ? (
              <Raster key={key} columns={W} rows={H} cells={frame(c.id, W, H, HOLD_T)} />
            ) : (
              <Text dimColor>{NO_PREVIEW}</Text>
            )}
            <Button key={'pick-' + j} hotkey={String(j + 1)} label={c.label} onPress={() => on.pick(j)} />
            {term ? <Text>{textOf(c.id, 'caption', ask)}</Text> : null}
            {term ? <Text dimColor>{textOf(c.id, 'when', ask)}</Text> : null}
            <Text dimColor>{chipsOf(c.id, defaultsOf(c.id), ask).join(' · ')}</Text>
          </Box>
        )
      })}
      <Box flexDirection="row" gap={2}>
        {ask.cancel ? <Button key="swap-cancel" hotkey="x" plain label={t(ask, 'keep')} onPress={() => on.cancel()} /> : null}
        {ask.cancel ? null : <Text dimColor>{t(ask, 'footerEsc')}</Text>}
      </Box>
    </Box>
  )
}
