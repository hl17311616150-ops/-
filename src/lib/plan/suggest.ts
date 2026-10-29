/**
 * AI 优化建议生成器与采纳（纯函数）—— Plan 3 Task 3。
 *
 * 基于 buildPlan 产出的 DayPlan[]，按内置规则检测三类建议：
 *  - pace 节奏：长距离自驾日当天还排了多个景点，节奏偏赶；
 *  - route 顺路：同一城市片区合并了多个点名，建议连住一处、白天往返；
 *  - stay 补住宿：缺住宿的晚补默认住宿；现有住宿不在景区内时推荐景区内选项。
 *
 * applySuggestions 仅采纳 status === 'accepted' 的建议；全程先深拷贝，不修改入参。
 * 纯函数：不读写本地存储、不联网；住宿选项取自内置数据层，查不到时安全跳过、不抛错。
 */

import { resolveCities, allocateDays } from './buildPlan'
import { defaultStay, queryStays } from './stays'
import type { StayOption } from './stays'
import type { DayPlan, PlanningDraft, Stay } from '../../types'
import type { TimeOfDay } from '../time'

/** 建议类型：节奏 / 顺路 / 补住宿 */
export type SuggestionKind = 'pace' | 'route' | 'stay'

/** 一条 AI 优化建议；targetDayIndex / stayId 按建议类型填充 */
export interface Suggestion {
  id: string
  kind: SuggestionKind
  text: string
  why: string
  status: 'open' | 'accepted' | 'ignored'
  targetDayIndex?: number
  stayId?: string
}

/** 时段固定顺序：上午 → 下午 → 晚上 */
const PERIOD_RANK: Record<TimeOfDay, number> = {
  morning: 0,
  afternoon: 1,
  evening: 2,
}

/** 节奏阈值：自驾里程 ≥ 500km，且当天非自驾 POI 块 ≥ 2 */
const PACE_MIN_KM = 500
const PACE_MIN_POIS = 2

/** 景区内标签（“景区附近”不算） */
const IN_CITY_TAG = '景区内'

/** 城市在行程中的落点：首日 dayIndex 与分配天数 */
interface CityPlan {
  city: string
  subPoints: string[]
  firstDayIndex: number
  dayCount: number
}

/**
 * 复算城市 → 天数落点（与 buildPlan 同一套合并 / 分配规则）。
 * 天数以实际传入的 dayPlans 长度为准，避免锚点缺失时与行程错位。
 */
function planCities(draft: PlanningDraft, dayCount: number): CityPlan[] {
  const cities = resolveCities(draft)
  const allocation = allocateDays(cities, dayCount, draft)
  const plans: CityPlan[] = []
  let dayIndex = 0
  cities.forEach((city, i) => {
    plans.push({
      city: city.city,
      subPoints: city.subPoints,
      firstDayIndex: dayIndex,
      dayCount: allocation[i] ?? 1,
    })
    dayIndex += allocation[i] ?? 1
  })
  return plans
}

/** 每个 dayIndex 对应的城市名；分配未覆盖到的位置留空（容错由上层兜底）。 */
function cityOfDay(draft: PlanningDraft, dayCount: number): (string | undefined)[] {
  const result: (string | undefined)[] = Array.from({ length: dayCount }, () => undefined)
  for (const plan of planCities(draft, dayCount)) {
    for (let k = 0; k < plan.dayCount; k += 1) {
      const i = plan.firstDayIndex + k
      if (i >= 0 && i < dayCount) result[i] = plan.city
    }
  }
  return result
}

/**
 * 扫描 DayPlan[] 生成建议。
 * 生成顺序：pace（按天）→ route（按城市）→ stay(a) 缺住宿（按晚）→ stay(b) 景区内（按城市）。
 */
export function suggest(dayPlans: DayPlan[], draft: PlanningDraft): Suggestion[] {
  const suggestions: Suggestion[] = []
  let seq = 0

  const push = (
    kind: SuggestionKind,
    text: string,
    why: string,
    extra: Pick<Suggestion, 'targetDayIndex' | 'stayId'> = {},
  ): void => {
    suggestions.push({
      id: `sug-${kind}-${seq}`,
      kind,
      text,
      why,
      status: 'open',
      ...extra,
    })
    seq += 1
  }

  // 规则 1 · pace：当天含 ≥500km 自驾段，且非自驾 POI 块 ≥ 2
  dayPlans.forEach((day, dayIndex) => {
    const driveBlock = day.blocks.find((b) => b.drive)
    const drive = driveBlock?.drive
    if (!drive) return
    if (drive.distanceKm < PACE_MIN_KM) return
    const poiBlocks = day.blocks.filter((b) => !b.drive)
    if (poiBlocks.length < PACE_MIN_POIS) return

    push(
      'pace',
      `Day${dayIndex} ${drive.from}→${drive.to} 车程长，当天还排了多个景点偏赶，建议把靠后的景点移到相邻天。`,
      `该段自驾 ${drive.distanceKm}km，当天另排 ${poiBlocks.length} 个景点，节奏偏紧。`,
      { targetDayIndex: dayIndex },
    )
  })

  const plans = planCities(draft, dayPlans.length)

  // 规则 2 · route：城市合并了 ≥2 个点名（至少并入 1 个被分组子点）
  for (const plan of plans) {
    if (plan.subPoints.length < 2) continue
    const children = plan.subPoints.slice(1).join('、')
    push(
      'route',
      `${children} 都在 ${plan.city} 片区、相距很近，建议连住一处、白天往返，少搬行李。`,
      `${plan.subPoints.join('、')} 已合并为 ${plan.city} 一个片区，不必每晚更换住宿。`,
      { targetDayIndex: plan.firstDayIndex },
    )
  }

  const cityByDay = cityOfDay(draft, dayPlans.length)

  // 规则 3(a) · stay：某晚（除最后一天外）缺住宿 → 推荐该城市默认住宿
  for (let i = 0; i < dayPlans.length - 1; i += 1) {
    const day = dayPlans[i]
    if (day.stay != null) continue
    const city = cityByDay[i]
    if (!city) continue
    const option = defaultStay(city)
    if (!option) continue
    push(
      'stay',
      `${city} 当晚尚未安排住宿，建议入住 ${option.name}。`,
      `该晚缺少落脚点，先安排 ${city} 的默认住宿，行程不中断。`,
      { targetDayIndex: i, stayId: option.id },
    )
  }

  // 规则 3(b) · stay：每个城市至多一条；第一晚已有住宿且不在景区内，才推荐景区内选项
  for (const plan of plans) {
    const firstDay = dayPlans[plan.firstDayIndex]
    if (!firstDay) continue
    const stay = firstDay.stay
    // 缺住宿已由 3(a) 处理；此处先判空，禁止访问 undefined.tags
    if (stay == null) continue
    const existingTags = Array.isArray(stay.tags) ? stay.tags : []
    if (existingTags.includes(IN_CITY_TAG)) continue
    const inCity = queryStays(plan.city).find((option) => option.tags.includes(IN_CITY_TAG))
    if (!inCity) continue
    push(
      'stay',
      `${plan.city} 当晚推荐 ${inCity.name}（评分 ${inCity.rating}、景区内、可停车）。`,
      `现住 ${stay.name} 不在景区内，同片区有景区内住宿可选，省去往返奔波。`,
      { targetDayIndex: plan.firstDayIndex, stayId: inCity.id },
    )
  }

  return suggestions
}

/** 按 stayId 在指定城市的住宿选项中查找；查不到返回 undefined（安全跳过）。 */
function findStayOption(city: string | undefined, stayId: string): StayOption | undefined {
  if (!city) return undefined
  return queryStays(city).find((option) => option.id === stayId)
}

/** 采纳 stay：用 stayId 取住宿更新目标晚；缺住宿则补上，changed 置 true。 */
function applyStay(days: DayPlan[], suggestion: Suggestion, draft: PlanningDraft): void {
  const target = suggestion.targetDayIndex
  if (target == null || target < 0 || target >= days.length) return
  const day = days[target]
  if (!day || !suggestion.stayId) return

  const city = day.stay?.location ?? cityOfDay(draft, days.length)[target]
  const option = findStayOption(city, suggestion.stayId)
  if (!option) return

  day.stay = {
    nightIndex: day.dayIndex,
    name: option.name,
    location: option.point,
    changed: true,
    stayId: option.id,
    rating: option.rating,
    tags: [...option.tags],
  } satisfies Stay
}

/** 采纳 route：从该城市第一晚起，把 location 相同的连续晚统一为第一晚住宿；第一晚保持原值。 */
function applyRoute(days: DayPlan[], suggestion: Suggestion): void {
  const start = suggestion.targetDayIndex
  if (start == null || start < 0 || start >= days.length) return
  const base = days[start].stay
  if (!base) return
  const baseLocation = base.location

  for (let j = start + 1; j < days.length; j += 1) {
    const current = days[j].stay
    if (!current || current.location !== baseLocation) break
    days[j].stay = { ...base, nightIndex: days[j].dayIndex, changed: true }
  }
}

/** 采纳 pace：把自驾日最后一个非自驾 POI 块移到下一天（无下一天则前一天），保持时段顺序。 */
function applyPace(days: DayPlan[], suggestion: Suggestion): void {
  const sourceIndex = suggestion.targetDayIndex
  if (sourceIndex == null || sourceIndex < 0 || sourceIndex >= days.length) return
  const source = days[sourceIndex]

  let poiPosition = -1
  for (let k = source.blocks.length - 1; k >= 0; k -= 1) {
    if (!source.blocks[k].drive) {
      poiPosition = k
      break
    }
  }
  if (poiPosition === -1) return

  const [moved] = source.blocks.splice(poiPosition, 1)

  let destinationIndex = sourceIndex + 1 < days.length ? sourceIndex + 1 : sourceIndex - 1
  if (destinationIndex < 0) return
  const destination = days[destinationIndex]
  if (!destination) return

  const rank = PERIOD_RANK[moved.period]
  let insertAt = destination.blocks.findIndex((block) => PERIOD_RANK[block.period] > rank)
  if (insertAt === -1) insertAt = destination.blocks.length
  destination.blocks.splice(insertAt, 0, moved)
}

/**
 * 采纳建议：先深拷贝 dayPlans（不修改入参），仅处理 status === 'accepted' 的建议；
 * 找不到目标晚 / 住宿时安全跳过，不抛错。返回新的 DayPlan[]。
 */
export function applySuggestions(
  dayPlans: DayPlan[],
  suggestions: Suggestion[],
  draft: PlanningDraft,
): DayPlan[] {
  const copy = JSON.parse(JSON.stringify(dayPlans)) as DayPlan[]

  for (const suggestion of suggestions) {
    if (suggestion.status !== 'accepted') continue
    switch (suggestion.kind) {
      case 'stay':
        applyStay(copy, suggestion, draft)
        break
      case 'route':
        applyRoute(copy, suggestion)
        break
      case 'pace':
        applyPace(copy, suggestion)
        break
    }
  }

  return copy
}
