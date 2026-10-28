import { loadArray, save } from '../storage/store'
import { prepKey } from '../storage/keys'
import type { ChecklistItem } from '../types'
import { createChecklistItem } from '../types'

function isChecklistItem(x: unknown): x is ChecklistItem {
  return (
    !!x &&
    typeof x === 'object' &&
    typeof (x as ChecklistItem).id === 'string' &&
    typeof (x as ChecklistItem).text === 'string'
  )
}

export function getPrepList(prepId: string): ChecklistItem[] {
  return loadArray(prepKey(prepId), isChecklistItem, [])
}

export function savePrepList(prepId: string, items: ChecklistItem[]): void {
  save(prepKey(prepId), items)
}

/** 首次注入自动生成项（仅 source:auto，供页面初始化） */
export function initAuto(prepId: string, autoItems: ChecklistItem[]): void {
  savePrepList(prepId, autoItems)
}

export function addManual(prepId: string, text: string): void {
  if (!text.trim()) return
  const item = createChecklistItem(text.trim(), prepId)
  item.source = 'manual'
  savePrepList(prepId, [...getPrepList(prepId), item])
}

export function removeItem(prepId: string, itemId: string): void {
  savePrepList(
    prepId,
    getPrepList(prepId).filter((i) => i.id !== itemId),
  )
}

export function toggleItem(prepId: string, itemId: string): void {
  savePrepList(
    prepId,
    getPrepList(prepId).map((i) => (i.id === itemId ? { ...i, checked: !i.checked } : i)),
  )
}
