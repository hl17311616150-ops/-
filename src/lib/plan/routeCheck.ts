/**
 * 路线本地校验：地理重叠 / 顺序 / 时间。
 * 纯函数、本地简化规则，不联网、不接模型或地图服务；供 Task 6 路线步骤调用。
 */

import type { TripTimeSummary } from '../time'

export type CheckKind = 'overlap' | 'order' | 'time'

export interface RouteCheck {
  kind: CheckKind
  level: 'decide' | 'info'
  title: string
  detail: string
  child?: string
  parent?: string
}

/** 村落 → 所属境内区域（本地简化归属表） */
export const POINT_PARENTS: Record<string, string> = {
  宏村: '黟县',
  西递: '黟县',
  塔川: '黟县',
  卢村: '黟县',
  木坑: '黟县',
  南屏: '黟县',
}

/**
 * 地理顺序索引：值越大越靠后。
 * 长沙 < 景德镇 < 黟县（周边各村落同圈层、村与村之间给递增索引）< 呈坎。
 */
const ORDER_INDEX: Record<string, number> = {
  长沙: 10,
  景德镇: 20,
  黟县: 30,
  宏村: 31,
  西递: 32,
  塔川: 33,
  卢村: 34,
  木坑: 35,
  南屏: 36,
  呈坎: 40,
}

/** 相邻城市/片区简化里程（km）；键为 出发->到达，反向同样可查 */
const MILEAGE_KM: Record<string, number> = {
  '长沙->景德镇': 500,
  '长沙->黟县': 660,
  '景德镇->黟县': 170,
  '黟县->呈坎': 40,
}

/** 单日驾驶里程偏赶阈值（km）：严格大于才提示，500km 本身不算偏赶 */
const MAX_DAILY_KM = 500

/** 查询两点之间的简化里程；表内查不到返回 null（该段不参与里程判断） */
function mileageBetween(a: string, b: string): number | null {
  const direct = MILEAGE_KM[`${a}->${b}`]
  if (direct !== undefined) return direct
  const reverse = MILEAGE_KM[`${b}->${a}`]
  if (reverse !== undefined) return reverse
  return null
}

/** 地理重叠：points 同时含某 child 与所属 parent，逐对生成一条 decide 级提示 */
function collectOverlaps(present: Set<string>): RouteCheck[] {
  const checks: RouteCheck[] = []
  for (const [child, parent] of Object.entries(POINT_PARENTS)) {
    if (present.has(child) && present.has(parent)) {
      checks.push({
        kind: 'overlap',
        level: 'decide',
        child,
        parent,
        title: `${child}在${parent}境内`,
        detail: `建议作为${parent}重点村安排、不另算城市、想去的点都保留`,
      })
    }
  }
  return checks
}

/** 顺序：表内点按索引检查是否非递减；始终生成一条 info */
function collectOrder(points: string[]): RouteCheck {
  const seq = points
    .map((p) => ORDER_INDEX[p])
    .filter((n): n is number => n !== undefined)

  let reversed = false
  for (let i = 1; i < seq.length; i += 1) {
    if (seq[i] < seq[i - 1]) {
      reversed = true
      break
    }
  }

  if (reversed) {
    return {
      kind: 'order',
      level: 'info',
      title: '当前点顺序可能绕路，建议顺路调整（仅告知）',
      detail: '按地理方向看部分点先后颠倒，可参考顺序手动调整；仅为提示，不强制。',
    }
  }
  return {
    kind: 'order',
    level: 'info',
    title: '当前点顺序无明显绕路',
    detail: '所选点的先后与地理方向基本一致，可直接进入下一步。',
  }
}

/** 时间：相邻点按一次城市间移动算一个驾驶日，存在单日 >500km 提示偏赶；始终生成一条 info */
function collectTime(points: string[]): RouteCheck {
  let rushed = false
  for (let i = 1; i < points.length; i += 1) {
    const km = mileageBetween(points[i - 1], points[i])
    if (km !== null && km > MAX_DAILY_KM) {
      rushed = true
      break
    }
  }

  if (rushed) {
    return {
      kind: 'time',
      level: 'info',
      title: '当天自驾偏赶，建议多留一天（仅告知）',
      detail: `存在单日超过 ${MAX_DAILY_KM}km 的车程，建议拆分行程、多留一天缓冲；仅为提示。`,
    }
  }
  return {
    kind: 'time',
    level: 'info',
    title: '时间与路程匹配，节奏合理',
    detail: '各段相邻车程在常规驾驶范围内，可按当前天数安排节奏。',
  }
}

/**
 * 校验路线：先出地理重叠（需决定），再出一条顺序 info；
 * time 为 null / undefined 时跳过时间检查，不生成 time 条目。
 * 非数组或非字符串元素容错过滤，不抛错。
 */
export function checkRoute(points: string[], time?: TripTimeSummary | null): RouteCheck[] {
  const list = Array.isArray(points)
    ? points.filter((p): p is string => typeof p === 'string')
    : []
  const present = new Set(list)

  const checks: RouteCheck[] = [...collectOverlaps(present), collectOrder(list)]
  if (time != null) {
    checks.push(collectTime(list))
  }
  return checks
}
