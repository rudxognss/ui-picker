import type { EngineInterface } from 'claude-code'
import type { Target } from './animate'
import { hasPng, imageRows, pngFrame } from './previews/images'
import { frame, hasPreview, HOLD_T } from './previews/index'
import type { PaneEvent } from './render-picker'
import type { Decision, Plan, Source } from './state'
import { changed, diff } from './state'
import type { StringKey } from './strings'
import { t } from './strings'
import { chipsOf, nameOf, paramLabel, TERMS } from './terms'

type ReviewMode = 'review' | 'building' | 'done'
type ReviewHandlers = {
  expand: (i: number) => void
  select: (i: number, key: string, raw: string) => void
  note: (i: number, text: string) => void
  swap: () => void
  reset: () => void
  confirm: () => void
}

const SOURCE: Record<Source, StringKey> = { model: 'sourceModel', user: 'sourceUser', recommended: 'sourceRecommended' }
const THUMB_W = 16
const THUMB_W_OPEN = 24
/** Below this body width the open row stacks its preview above the Selects. */
const WIDE = 60

type Thumb = { W: number; H: number; kind: Target['kind'] }

function thumbOf(d: Decision, open: boolean, e: PaneEvent, images: boolean): Thumb | undefined {
  const W = Math.min(open ? THUMB_W_OPEN : THUMB_W, e.props.bodyColumns - 24)
  if (W < 10) return undefined
  const H = imageRows(W, 4, 8)
  if (images && hasPng(d.term)) return { W, H, kind: 'image' }
  if (hasPreview(d.term)) return { W, H, kind: 'raster' }
  return undefined
}

/** One animation target per row that has a preview; the open row's is larger. */
export function reviewTargets(p: Plan, e: PaneEvent, images: boolean): Target[] {
  const out: Target[] = []
  p.decisions.forEach((d, i) => {
    const th = thumbOf(d, p.expanded === i, e, images)
    if (th) out.push({ key: 'rev-' + i, preview: d.term, W: th.W, H: th.H, kind: th.kind })
  })
  return out
}

function hintOf(mode: ReviewMode, p: Plan): string {
  const n = Math.min(p.decisions.length, 9)
  if (mode === 'building') return t(p, 'buildingHint')
  return t(p, mode === 'done' ? 'doneHint' : 'reviewHint', { n })
}

export function reviewTree($: EngineInterface, e: PaneEvent, mode: ReviewMode, p: Plan, images: boolean, on: ReviewHandlers): JSX.Element {
  const { Box, Text, Button, Select, Input, Raster, Image } = $.ui.resolve(e)
  const editable = mode !== 'building'
  const thumb = (d: Decision, i: number): JSX.Element | null => {
    const th = thumbOf(d, p.expanded === i, e, images)
    if (!th) return null
    return th.kind === 'image' ? (
      <Image key={'rev-' + i} source={{ png: pngFrame(d.term, HOLD_T) }} columns={th.W} rows={th.H} alt={nameOf(d.term, p)} />
    ) : (
      <Raster key={'rev-' + i} columns={th.W} rows={th.H} cells={frame(d.term, th.W, th.H, HOLD_T)} />
    )
  }
  const tags = (i: number): string => {
    const d = p.decisions[i]!
    return `[${t(p, SOURCE[d.source])}]${changed(p, i) ? ` [${t(p, 'changedTag')}]` : ''}`
  }
  const rowButton = (d: Decision, i: number): JSX.Element => {
    const label = `${d.area} · ${nameOf(d.term, p)}`
    return i < 9 ? (
      <Button key={'row-' + i} plain hotkey={String(i + 1)} label={label} onPress={() => on.expand(i)} />
    ) : (
      <Button key={'row-' + i} plain label={label} onPress={() => on.expand(i)} />
    )
  }
  const editor = (d: Decision, i: number): JSX.Element => {
    const specs = TERMS[d.term]?.params ?? []
    return (
      <Box flexDirection="column">
        <Box flexDirection="row" gap={2} flexWrap="wrap">
          {specs.map(s => (
            <Select
              key={`p-${i}-${s.key}`}
              label={paramLabel(d.term, s, p)}
              options={s.values.map(v => ({ value: String(v), label: String(v) + (s.unit ?? '') }))}
              value={String(d.params[s.key] ?? s.def)}
              onSelect={v => on.select(i, s.key, v)}
            />
          ))}
        </Box>
        <Input
          key={'note-' + i}
          label={t(p, 'note')}
          placeholder={t(p, 'notePlaceholder')}
          value={d.note ?? ''}
          submitLabel={t(p, 'save')}
          onSubmit={v => on.note(i, v)}
        />
        <Box flexDirection="row" gap={2}>
          <Button key="swap" hotkey="x" plain label={t(p, 'swap')} onPress={() => on.swap()} />
          <Button key="reset" hotkey="r" plain label={t(p, 'reset')} onPress={() => on.reset()} />
        </Box>
      </Box>
    )
  }
  const row = (d: Decision, i: number): JSX.Element => {
    const open = p.expanded === i
    const chips = chipsOf(d.term, d.params, p).join(' · ')
    if (!open) {
      return (
        <Box flexDirection="row" gap={1}>
          {thumb(d, i)}
          <Box flexDirection="column">
            {rowButton(d, i)}
            <Text dimColor wrap="truncate-end">
              {`${tags(i)}  ${chips}`}
            </Text>
          </Box>
        </Box>
      )
    }
    const wide = e.props.bodyColumns >= WIDE
    return (
      <Box flexDirection={wide ? 'row' : 'column'} gap={1}>
        {thumb(d, i)}
        <Box flexDirection="column">
          {rowButton(d, i)}
          <Text dimColor>{tags(i)}</Text>
          {editable ? editor(d, i) : <Text dimColor>{chips}</Text>}
        </Box>
      </Box>
    )
  }
  const action = (): JSX.Element | null => {
    if (mode === 'building') return null
    if (mode === 'done' && diff(p).length === 0) return null
    const label = t(p, mode === 'done' ? 'sendChanges' : 'build')
    const focus = p.expanded === undefined ? { autoFocus: true as const } : {}
    return <Button key="build" hotkey="0" variant="primary" {...focus} label={label} onPress={() => on.confirm()} />
  }
  return (
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="column">
        <Text bold>{`${p.title ? p.title + ' · ' : ''}${t(p, 'decisions', { n: p.decisions.length })}`}</Text>
        <Text dimColor>{hintOf(mode, p)}</Text>
      </Box>
      <Box flexDirection="column">{p.decisions.map(row)}</Box>
      {action()}
    </Box>
  )
}
