import { POIS } from '../../data/pois'

/** 回顾卡片 / 全屏视图使用的地点信息：所属点 + POI 名称 */
export interface PlaceInfo {
  point: string
  name: string
}

/**
 * 按日记条目的 nodeId 解析内置 POI：
 * nodeId 为 null 或未命中 POI 库时返回 null（不抛错）。
 */
export function resolvePlace(nodeId: string | null): PlaceInfo | null {
  if (nodeId === null) return null
  const poi = POIS.find((p) => p.id === nodeId)
  if (!poi) return null
  return { point: poi.point, name: poi.name }
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** 日记条目日期：「M月D日」；本地时区手动取值，不使用 toLocaleString */
export function formatEntryDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

/** 全屏视图时间：「M月D日 HH:mm」，时、分补零；本地时区手动取值，不使用 toLocaleString */
export function formatFullscreenTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}
