/**
 * AI 分步引导规划草稿的本地持久化。
 * - 草稿单例：固定 id 'current'，分步过程中随时落盘，刷新页面可续接。
 * - 损坏/形状错误数据由 store.loadObject 的守卫回退 null，不抛错、不白屏。
 */

import { loadObject, remove, save } from '../storage/store'
import { K } from '../storage/keys'
import type { PlanningDraft, PlanningStep } from '../types'

const PLANNING_STEPS: readonly PlanningStep[] = ['time', 'route', 'points', 'result']

/** 草稿形状守卫：id 为字符串、step 为合法步骤之一、points 为数组；任一不满足即视为损坏数据 */
function isPlanningDraft(o: Record<string, unknown>): boolean {
  return (
    typeof o.id === 'string' &&
    typeof o.step === 'string' &&
    (PLANNING_STEPS as readonly string[]).includes(o.step) &&
    Array.isArray(o.points)
  )
}

/** 新建一份空白规划草稿：停在第一步 time，出发/返程锚点为空 */
export function createDraft(): PlanningDraft {
  const now = Date.now()
  return {
    id: 'current',
    step: 'time',
    depart: null,
    back: null,
    points: [],
    selectedPois: {},
    days: [],
    createdAt: now,
    updatedAt: now,
  }
}

/** 读取当前草稿；无草稿或数据损坏时返回 null */
export function getDraft(): PlanningDraft | null {
  return loadObject<PlanningDraft>(K.planningDraft, isPlanningDraft)
}

/** 保存草稿：写入前刷新 updatedAt 时间戳 */
export function saveDraft(d: PlanningDraft): void {
  d.updatedAt = Date.now()
  save(K.planningDraft, d)
}

/** 清空当前规划草稿 */
export function clearDraft(): void {
  remove(K.planningDraft)
}
