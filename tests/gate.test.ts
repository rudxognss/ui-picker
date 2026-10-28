import type { PromptComposeInput } from 'claude-code'
import type { Engine } from 'claude-code/testing'
import { test, expect } from 'claude-code/testing'
import { DISABLED_LINE, PROMPT_SECTION_ID } from '../hooks/trigger'
import type { Recorded } from './kit'
import { bottoms, SESSION, TWO } from './kit'

const COMPOSE: PromptComposeInput = {
  model: 'claude',
  promptModel: 'claude',
  surfaces: ['terminal'],
  tools: ['mcp__ui-picker__ui_pick'],
  outputStyle: null,
  traits: [],
}

async function expectDisabled($: Engine, k: Recorded): Promise<void> {
  expect(k.registered).toEqual([])
  expect(k.logged).toEqual([DISABLED_LINE])
  const pick = await $.tool.call(TWO)
  expect((pick as any).deny).toBe(DISABLED_LINE)
  const c = await $.prompt.compose(COMPOSE)
  expect(c.sections.some(s => s.id === PROMPT_SECTION_ID)).toBe(false)
  const p = await $.prompt.submit({ text: 'add a settings page', wait: false, origin: { kind: 'composer' } })
  expect(p.context ?? []).toEqual([])
}

test('desktop surface registers nothing and logs the disabled line', async ($, on) => {
  const k = bottoms(on)
  await $.session.start({ ...SESSION, surface: 'desktop' })
  await expectDisabled($, k)
})

test('non-interactive registers nothing', async ($, on) => {
  const k = bottoms(on)
  await $.session.start({ ...SESSION, isInteractive: false })
  await expectDisabled($, k)
})

test('terminal interactive registers the one tool and the command', async ($, on) => {
  const k = bottoms(on)
  await $.session.start(SESSION)
  expect(k.registered).toEqual(['ui_pick'])
  expect(k.logged).toEqual([])
  const c = await $.prompt.compose(COMPOSE)
  const section = c.sections.find(s => s.id === PROMPT_SECTION_ID)
  expect(section?.scope).toBe('session')
  expect(section?.text).toContain('mcp__ui-picker__ui_pick')
  expect(section?.text).toContain('Check the right pane.')
  expect(section?.text).toContain('fix once and retry')
  expect(section?.text).toContain('"ui-picker: build"')
  expect(section!.text.split('\n').length).toBeLessThanOrEqual(10)
})

test('a request that does not offer ui_pick gets no rules section', async ($, on) => {
  bottoms(on)
  await $.session.start(SESSION)
  const c = await $.prompt.compose({ ...COMPOSE, tools: ['Read', 'Grep'] })
  expect(c.sections.some(s => s.id === PROMPT_SECTION_ID)).toBe(false)
})
