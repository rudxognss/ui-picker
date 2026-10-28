import type { L } from '../types'

export type StringKey =
  | 'progress'
  | 'decisions'
  | 'pickPrompt'
  | 'footerEsc'
  | 'recommendedTag'
  | 'sourceModel'
  | 'sourceUser'
  | 'sourceRecommended'
  | 'changedTag'
  | 'reviewHint'
  | 'buildingHint'
  | 'doneHint'
  | 'swapPrompt'
  | 'keep'
  | 'current'
  | 'build'
  | 'sendChanges'
  | 'save'
  | 'note'
  | 'notePlaceholder'
  | 'swap'
  | 'reset'
  | 'pendingHead'
  | 'noContent'
  | 'terminalOnly'
  | 'typedPick'
  | 'typedLast'
  | 'typedInReview'
  | 'typedNoOption'
  | 'notDeliveredFilled'
  | 'notDeliveredTyped'

const EN: Record<StringKey, string> = {
  progress: 'Question {i} of {n}',
  decisions: 'decisions {n}',
  pickPrompt: 'Pick a pattern for this area',
  footerEsc: 'Esc: apply recommended to remaining',
  recommendedTag: 'recommended',
  sourceModel: 'model',
  sourceUser: 'your pick',
  sourceRecommended: 'recommended',
  changedTag: 'changed',
  reviewHint: 'Enter: build · 1-{n}: edit · Esc: back to prompt',
  buildingHint: 'Building with these… (edits apply after)',
  doneHint: 'Built · 1-{n}: edit · Enter: send changes',
  swapPrompt: 'Swap the pattern for {area}',
  keep: 'keep',
  current: ' (current)',
  build: 'Build',
  sendChanges: 'Send changes',
  save: 'Save',
  note: 'Note',
  notePlaceholder: 'An instruction for this row',
  swap: 'swap pattern',
  reset: 'reset',
  pendingHead: 'ui-picker: a plan is pending in the pane; the person has not confirmed it:',
  noContent: 'Nothing to show. Ask for UI and the plan appears here.',
  terminalOnly: 'ui-picker: terminal only.',
  typedPick: 'ui-picker: option {k} recorded. Question {i} of {n} is in the pane.',
  typedLast: 'ui-picker: option {k} recorded. Review the plan in the pane; Enter builds.',
  typedInReview: 'ui-picker: the plan is in the pane. Press Enter there to build, or type your change.',
  typedNoOption: 'ui-picker: no option {k}. Press 1-{n}.',
  notDeliveredFilled: 'ui-picker: message not delivered ({reason}). It is in the prompt box; press Enter to send.',
  notDeliveredTyped: 'ui-picker: message not delivered ({reason}). Type your decisions to continue.',
}

const KO: Record<StringKey, string> = {
  progress: '질문 {i}/{n}',
  decisions: '결정 {n}',
  pickPrompt: '이 영역의 패턴을 고르세요',
  footerEsc: 'Esc: 남은 질문 추천 적용',
  recommendedTag: '추천',
  sourceModel: '모델 판단',
  sourceUser: '네 선택',
  sourceRecommended: '추천 적용',
  changedTag: '변경',
  reviewHint: 'Enter: 빌드 · 1-{n}: 수정 · Esc: 입력창으로',
  buildingHint: '이 결정으로 만드는 중… (수정은 이후 반영)',
  doneHint: '완료 · 1-{n}: 수정 · Enter: 변경 보내기',
  swapPrompt: '{area}의 패턴 바꾸기',
  keep: '그대로',
  current: ' (지금)',
  build: '빌드',
  sendChanges: '변경 보내기',
  save: '저장',
  note: '메모',
  notePlaceholder: '이 행에 대한 지시',
  swap: '패턴 바꾸기',
  reset: '기본값',
  pendingHead: 'ui-picker: 패널에 확인 대기 중인 계획이 있습니다 (아직 확정 아님):',
  noContent: '표시할 내용 없음. UI를 요청하면 계획이 여기에 나타납니다.',
  terminalOnly: 'ui-picker: 터미널 전용.',
  typedPick: 'ui-picker: {k}번 선택 기록. 질문 {i}/{n}이 패널에 있습니다.',
  typedLast: 'ui-picker: {k}번 기록. 패널에서 계획을 확인하고 Enter로 만드세요.',
  typedInReview: 'ui-picker: 계획이 패널에 있습니다. 패널에서 Enter로 만들거나 바꿀 점을 입력하세요.',
  typedNoOption: 'ui-picker: {k}번 선택지가 없습니다. 1-{n}을 누르세요.',
  notDeliveredFilled: 'ui-picker: 메시지가 전달되지 않았습니다 ({reason}). 입력창에 넣어 두었으니 Enter로 보내세요.',
  notDeliveredTyped: 'ui-picker: 메시지가 전달되지 않았습니다 ({reason}). 결정을 직접 입력해 주세요.',
}

export const STRING_KEYS: readonly string[] = Object.keys(EN)

/** Model labels first, then the built-in dictionary ('ko' or English). */
export function t(l: L, key: StringKey, vars?: Record<string, string | number>): string {
  const s = l.labels?.ui?.[key] ?? (l.lang === 'ko' ? KO : EN)[key]
  if (!vars) return s
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
}
