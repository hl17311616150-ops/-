import type { Destination } from '../types'

/**
 * 本月推荐：先按 seasonMonths 筛选适宜月份；
 * intent 提供时做"软过滤"——命中该类型的排前面，但不剔除其余（非硬过滤），
 * 避免路线/推荐千篇一律。
 */
export function recommendByMonth(
  destinations: Destination[],
  month: number,
  intent?: string,
): Destination[] {
  const inSeason = destinations.filter((d) => d.seasonMonths.includes(month))
  if (!intent) return inSeason

  // 稳定排序：命中意图的优先，其余保持原顺序
  const matches = inSeason.filter((d) => d.typeTags.includes(intent))
  const rest = inSeason.filter((d) => !d.typeTags.includes(intent))
  return [...matches, ...rest]
}
