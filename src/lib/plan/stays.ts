/**
 * 住宿选项数据层（本地模拟）。
 * 静态内置数据，不联网、不接模型 / 高德；queryStays / defaultStay 均为纯函数。
 * 供行程生成器与 DayCard 换住宿功能作为数据源。
 */

import { STAYS } from '../../data/stays'

export interface StayOption {
  id: string
  point: string
  name: string
  rating: number
  tags: string[]
  desc: string
}

/**
 * 按点查询住宿：按 point 过滤，保持数据原顺序（不做重排）。
 */
export function queryStays(point: string): StayOption[] {
  return STAYS.filter((s) => s.point === point)
}

/** 返回该点第一条住宿；无该点时返回 undefined（容错）。 */
export function defaultStay(point: string): StayOption | undefined {
  return STAYS.find((s) => s.point === point)
}
