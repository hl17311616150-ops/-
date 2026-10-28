import { loadArray, save } from '../storage/store'
import { K } from '../storage/keys'

export type SectionId = 'home' | 'recommend' | 'space' | 'community'

const ALL: SectionId[] = ['home', 'recommend', 'space', 'community']
const DEFAULT_ORDER: SectionId[] = ['home', 'recommend', 'space', 'community']

function isSectionId(x: unknown): x is SectionId {
  return x === 'home' || x === 'recommend' || x === 'space' || x === 'community'
}

export function getSectionOrder(): SectionId[] {
  const stored = loadArray<SectionId>(K.sectionOrder, isSectionId, DEFAULT_ORDER)
  // 去重并补齐缺失板块，保证始终含且仅含全部板块
  const seen = new Set<SectionId>()
  const order = stored.filter((s) => (seen.has(s) ? false : (seen.add(s), true)))
  for (const s of ALL) if (!seen.has(s)) order.push(s)
  return order
}

export function setSectionOrder(order: SectionId[]): void {
  save(K.sectionOrder, order)
}
