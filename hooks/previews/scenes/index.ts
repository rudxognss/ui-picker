import type { Scene } from '../canvas'
import { stage } from '../canvas'
import { COMPONENT } from './component'
import { EFFECT } from './effect'
import { LAYOUT } from './layout'

/** Bare desktop stage: a Raster-only pseudo id tests use as a neutral option preview. Never rendered to PNG. */
const window: Scene = c => {
  stage.desktop(c)
}

export const SCENES: Readonly<Record<string, Scene>> = { ...LAYOUT, ...COMPONENT, ...EFFECT, window }
