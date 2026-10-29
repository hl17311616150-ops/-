/**
 * Plan 3 Task 4：保存行程（draft → Trip）。
 *
 * 职责：
 *  - draftToTrip：把 AI 规划草稿 + 生成的 DayPlan[] 转换成一条完整 Trip（纯转换，不触存储）；
 *  - saveGeneratedTrip：转换后经统一存储层写入 K.trip，并返回该 Trip。
 *
 * 容错：draft.depart/back 可能为 null（锚点与出发日期给 null）；cities 为空时
 * startPoint / waypoints / destinationId / title 安全兜底，不抛错。
 */

import { createTrip } from '../../types'
import type { DayPlan, PlanningDraft, Trip } from '../../types'
import { resolveCities } from './buildPlan'
import { save } from '../../storage/store'
import { K } from '../../storage/keys'

/**
 * 把规划草稿与按天计划转换为一条完整 Trip。
 * 以 createTrip() 起步再覆盖业务字段，避免漏默认字段；时间戳取当前时刻。
 */
export function draftToTrip(draft: PlanningDraft, dayPlans: DayPlan[]): Trip {
  const cityNames = resolveCities(draft).map((c) => c.city)
  const totalDays = dayPlans.length

  const startPoint = cityNames[0] ?? ''
  // 途经点 = 首末之间的城市；首尾城为空或仅一两个城市时天然为空数组
  const waypoints = cityNames.slice(1, -1)
  const destinationId = cityNames.length > 0 ? cityNames[cityNames.length - 1] : null

  const title =
    cityNames.length > 0 ? `${cityNames.join('→')} ${totalDays}日` : `${totalDays}日`

  const now = Date.now()
  const trip = createTrip()
  return {
    ...trip,
    title,
    departDate: draft.depart?.date ?? null,
    totalDays,
    startPoint,
    waypoints,
    destinationId,
    departAnchor: draft.depart,
    backAnchor: draft.back,
    dayPlans,
    source: 'ai',
    departed: false,
    departedAt: null,
    diary: [],
    visibility: 'self',
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * 转换草稿为 Trip 并经统一存储层保存到 K.trip，返回该 Trip。
 * 写入失败由 save 返回 false（不抛错）；调用方按需提示。
 */
export function saveGeneratedTrip(draft: PlanningDraft, dayPlans: DayPlan[]): Trip {
  const trip = draftToTrip(draft, dayPlans)
  save(K.trip, trip)
  return trip
}
