/**
 * 行程生成器（核心纯函数）：把 PlanningDraft 转成按天的 DayPlan[]。
 *
 * 职责（Plan 3 Task 2，规则 0–6）：
 *  - 城市合并（子点并入已出现的父城市，保持顺序）；
 *  - 天数贪心分配（先满足各城市最少天数，剩余按 POI/当前天数 比值最大贪心 +1，并列取靠前）；
 *  - 时段编排（morning → afternoon → evening；出发块 / 自驾段 / 返程块占位，其余填 POI）；
 *  - 城市间自驾段（查里程表，查不到里程与时长记 0）；
 *  - 每晚住宿（除最后一天外，取 defaultStay，缺失时该晚留空不报错）。
 *
 * 纯函数：不读写本地存储、不联网；POI 详情取自内置 POIS 库，坏 id 容错跳过。
 */

import { POIS } from '../../data/pois'
import type { Poi } from './pois'
import { defaultStay } from './stays'
import { mileageBetween } from './routeCheck'
import { addDays, computeTripTime } from '../time'
import type { TimeOfDay } from '../time'
import type { DayPlan, PlanningDraft, ScheduledBlock, Stay } from '../../types'

/** 时段固定顺序：上午 → 下午 → 晚上 */
const PERIODS: readonly TimeOfDay[] = ['morning', 'afternoon', 'evening']

/** 合并后的一个城市：城市名 = 首个出现的代表点，subPoints 为其下所有原始点（保持顺序） */
export interface ResolvedCity {
  city: string
  subPoints: string[]
}

/** POI id → POI 详情查找表（进程内构建一次；坏 id / 查不到由上层容错跳过） */
const POI_BY_ID = new Map<string, Poi>(POIS.map((p) => [p.id, p]))

/**
 * 规则 1：按 points 顺序合并城市。
 * pointGrouping[child]=parent 且 parent 已作为城市出现时，child 并入其 subPoints，不新建城市；
 * 未分组（或父城市尚未出现）的点各为一城市；保持原顺序。非字符串/空值容错跳过。
 */
export function resolveCities(draft: PlanningDraft): ResolvedCity[] {
  const grouping = draft.pointGrouping ?? {}
  const cities: ResolvedCity[] = []
  const cityIndex = new Map<string, number>()

  for (const point of draft.points) {
    if (typeof point !== 'string' || point === '') continue
    const parent = grouping[point]
    if (parent !== undefined && cityIndex.has(parent)) {
      cities[cityIndex.get(parent) as number].subPoints.push(point)
      continue
    }
    cityIndex.set(point, cities.length)
    cities.push({ city: point, subPoints: [point] })
  }

  return cities
}

/** 规则 2：收集城市 POI id——按 subPoint 顺序、数据顺序展开并按 id 去重；坏条目容错跳过。 */
function collectPoiIds(city: ResolvedCity, draft: PlanningDraft): string[] {
  const seen = new Set<string>()
  const ids: string[] = []
  for (const sub of city.subPoints) {
    const list = draft.selectedPois[sub]
    if (!Array.isArray(list)) continue
    for (const id of list) {
      if (typeof id === 'string' && id !== '' && !seen.has(id)) {
        seen.add(id)
        ids.push(id)
      }
    }
  }
  return ids
}

/** 城市解析后的 POI 列表（查不到的 id 丢弃，不抛错）。 */
function collectPois(city: ResolvedCity, draft: PlanningDraft): Poi[] {
  return collectPoiIds(city, draft)
    .map((id) => POI_BY_ID.get(id))
    .filter((p): p is Poi => p !== undefined)
}

/**
 * 规则 3：城市最少天数。
 * 首日容量 2 个时段（出发城市被出发块占 1、自驾到达城市被自驾段占 1），后续完整日容量 3。
 * p ≤ 2 → 1 天；否则 1 + ceil((p - 2) / 3)。
 */
function minDaysFor(p: number): number {
  if (p <= 2) return 1
  return 1 + Math.ceil((p - 2) / 3)
}

/**
 * 规则 4：贪心分配天数。
 * 先给每城市最少天数；剩余 R = totalDays − 最少总和，R 次每次给 POI 数 / 当前天数 比值最大
 * （并列取靠前）的城市 +1；R < 0 时保持最少天数（不裁剪 POI）。
 */
export function allocateDays(
  cities: ResolvedCity[],
  totalDays: number,
  draft: PlanningDraft,
): number[] {
  const poiCounts = cities.map((c) => collectPoiIds(c, draft).length)
  const days = poiCounts.map((p) => minDaysFor(p))

  let remaining = totalDays - days.reduce((sum, n) => sum + n, 0)
  if (remaining < 0) remaining = 0

  while (remaining > 0) {
    let best = 0
    let bestRatio = -Infinity
    for (let i = 0; i < cities.length; i += 1) {
      const ratio = poiCounts[i] / days[i]
      if (ratio > bestRatio) {
        bestRatio = ratio
        best = i
      }
    }
    days[best] += 1
    remaining -= 1
  }

  return days
}

/** 规则 0：总天数。双锚点用 computeTripTime；缺失时兜底 max(1, points.length)，容错不白屏。 */
function resolveTotalDays(draft: PlanningDraft): number {
  if (draft.depart && draft.back) {
    return computeTripTime(draft.depart, draft.back).totalDays
  }
  return Math.max(1, draft.points.length)
}

/** 城市间自驾段：里程可查时按时速 90km/h 估算分钟；查不到里程与时长均记 0。 */
function buildDrive(prevCity: string, city: string): ScheduledBlock {
  const km = mileageBetween(prevCity, city)
  const distanceKm = km ?? 0
  const durationMin = km !== null ? Math.round((km / 90) * 60) : 0
  return {
    period: 'morning',
    title: `自驾前往 ${city}`,
    drive: { from: prevCity, to: city, distanceKm, durationMin },
  }
}

/**
 * 规则 5 + 6：编排每一天并挂住宿。
 * 返回按城市顺序、城市内日期顺序排列的 DayPlan[]。
 */
export function buildPlan(draft: PlanningDraft): DayPlan[] {
  const cities = resolveCities(draft)
  if (cities.length === 0) return []

  const totalDays = resolveTotalDays(draft)
  const dayAllocation = allocateDays(cities, totalDays, draft)
  const cityPois = cities.map((c) => collectPois(c, draft))

  const days: DayPlan[] = []
  let dayIndex = 0

  cities.forEach((city, c) => {
    const pois = cityPois[c]
    let poiCursor = 0
    const isFirstCity = c === 0
    const isLastCity = c === cities.length - 1
    const cityDayCount = dayAllocation[c]

    for (let k = 0; k < cityDayCount; k += 1) {
      const isFirstDayOfCity = k === 0
      const isLastDayOfCity = k === cityDayCount - 1
      const isLastGlobalDay = isLastCity && isLastDayOfCity

      // 预留块：period → 块；出发块 / 自驾段 / 返程块互斥时段，重叠情形（既是自驾首日又是返程末日）可共存。
      const reserved = new Map<TimeOfDay, ScheduledBlock>()

      if (isFirstCity && isFirstDayOfCity && draft.depart) {
        reserved.set(draft.depart.period, {
          period: draft.depart.period,
          title: `出发，前往 ${city.city}`,
          note: '首日行程不排满',
        })
      }

      if (!isFirstCity && isFirstDayOfCity) {
        reserved.set('morning', buildDrive(cities[c - 1].city, city.city))
      }

      if (isLastCity && isLastDayOfCity && draft.back) {
        reserved.set(draft.back.period, {
          period: draft.back.period,
          title: '返程',
          note: '返程回到家',
        })
      }

      const blocks: ScheduledBlock[] = []
      for (const period of PERIODS) {
        const reservedBlock = reserved.get(period)
        if (reservedBlock) {
          blocks.push(reservedBlock)
          continue
        }
        if (poiCursor < pois.length) {
          const poi = pois[poiCursor]
          poiCursor += 1
          blocks.push({ period, title: poi.name, poiId: poi.id, note: poi.desc })
        }
      }

      const date = draft.depart ? addDays(draft.depart.date, dayIndex) : `day-${dayIndex + 1}`

      let stay: Stay | undefined
      if (!isLastGlobalDay) {
        const option = defaultStay(city.city)
        if (option) {
          stay = {
            nightIndex: dayIndex,
            name: option.name,
            location: city.city,
            changed: false,
            stayId: option.id,
            rating: option.rating,
            tags: option.tags,
          }
        }
      }

      days.push({ dayIndex, date, blocks, stay })
      dayIndex += 1
    }
  })

  return days
}
