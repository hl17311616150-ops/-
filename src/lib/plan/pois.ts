/**
 * 结构化 POI 数据层（本地模拟）。
 * 静态内置数据，不联网、不接模型 / 高德；queryPois / defaultPoiIds 均为纯函数。
 * 供 Task 8 点列表、Task 9 点详情作为数据源。
 */

import { POIS } from '../../data/pois'

export type PoiCategory = 'nature' | 'village' | 'museum' | 'religion' | 'other'

export interface Poi {
  id: string
  point: string
  name: string
  rating: number
  distanceKm: number
  category: PoiCategory
  desc: string
  classic: boolean
}

export interface PoiQuery {
  search?: string
  category?: PoiCategory | 'all'
  sort?: 'hot' | 'distance' | 'rating'
  page?: number
  pageSize?: number
}

/**
 * 按点查询 POI：
 * 1. 先按 point 过滤；
 * 2. 叠加 search（名称包含、忽略大小写）与 category（非 all / 非空时）过滤，两者为交集；
 * 3. 排序：hot=数据原顺序（固定热度序）、distance=distanceKm 升序、rating=rating 降序；
 * 4. 分页切片（page 从 0 开始）。
 * 返回的 total 为过滤后、分页前的总数。
 */
export function queryPois(point: string, q: PoiQuery): { items: Poi[]; total: number } {
  let list = POIS.filter((p) => p.point === point)

  const search = q.search?.trim()
  if (search) {
    const needle = search.toLocaleLowerCase()
    list = list.filter((p) => p.name.toLocaleLowerCase().includes(needle))
  }

  if (q.category && q.category !== 'all') {
    list = list.filter((p) => p.category === q.category)
  }

  const sort = q.sort ?? 'hot'
  if (sort === 'distance') {
    list = [...list].sort((a, b) => a.distanceKm - b.distanceKm)
  } else if (sort === 'rating') {
    list = [...list].sort((a, b) => b.rating - a.rating)
  }
  // hot：保持数据原顺序（固定热度序），不做稳定重排。

  const total = list.length
  const page = q.page ?? 0
  const pageSize = q.pageSize ?? total
  const items = list.slice(page * pageSize, (page + 1) * pageSize)

  return { items, total }
}

/** 返回该点所有 classic:true 项的 id（保持数据顺序）。 */
export function defaultPoiIds(point: string): string[] {
  return POIS.filter((p) => p.point === point && p.classic).map((p) => p.id)
}

/**
 * 替换路线节点后裁剪旧已选 POI 映射：仅保留键仍在新 points 内的条目，
 * 其余剔除，避免离场点的已选记录残留；points / selected 为空或缺省时安全返回空对象。
 */
export function pruneSelectedPois(
  points: string[],
  selected?: Record<string, string[]> | null,
): Record<string, string[]> {
  if (!Array.isArray(points) || !selected || typeof selected !== 'object' || Array.isArray(selected)) {
    return {}
  }
  const keep = new Set(points)
  const result: Record<string, string[]> = {}
  for (const [point, ids] of Object.entries(selected)) {
    if (keep.has(point) && Array.isArray(ids)) result[point] = ids
  }
  return result
}
