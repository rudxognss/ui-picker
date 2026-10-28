import type { EngineInterface } from 'claude-code'
import type { PaneState } from './state'

/** The pane as last written, with the session it belongs to. */
type Mirror = { session: string; state: PaneState }
const KEY = 'pane'

/** Copies the pane to this plugin's store: the session state has been seen to come up empty after a pane was closed by hand. */
export async function mirror($: EngineInterface, state: PaneState): Promise<PaneState> {
  try {
    if (state.plan) await $.store.set(KEY, { session: await $.session.id(), state } satisfies Mirror)
    else await $.store.delete(KEY)
  } catch {
    // ponytail: the mirror is insurance; a store that refuses never blocks the pane
  }
  return state
}

/** This session's mirrored pane with a plan, or undefined (none, another session's, or a store that refuses). */
export async function mirrored($: EngineInterface): Promise<PaneState | undefined> {
  try {
    const m = (await $.store.get(KEY)) as Mirror | undefined
    return m?.state.plan && m.session === (await $.session.id()) ? m.state : undefined
  } catch {
    return undefined
  }
}
