/** 一天内的时段锚点 */
export type TimeOfDay = 'morning' | 'afternoon' | 'evening'

/** 时间锚点：某个日期 + 当天时段；date 为 YYYY-MM-DD */
export interface TimeAnchor {
  date: string
  period: TimeOfDay
}

/** 行程时间汇总：总天数、晚数、完整日数、覆盖到的日期序列 */
export interface TripTimeSummary {
  totalDays: number
  nights: number
  fullDays: number
  dates: string[]
}

const MS_PER_DAY = 86_400_000

/** 用本地时区把 YYYY-MM-DD 解析为本地午夜，避免 UTC 偏移导致跨日 */
function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** 格式化为 YYYY-MM-DD */
function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 两个日期相差的整天数（to - from）；to 早于 from 时为负 */
export function dayDiff(from: string, to: string): number {
  const ms = parseDate(to).getTime() - parseDate(from).getTime()
  return Math.round(ms / MS_PER_DAY)
}

/** 日期顺延 n 天（自动处理跨月、跨年），返回 YYYY-MM-DD */
export function addDays(date: string, n: number): string {
  const d = parseDate(date)
  d.setDate(d.getDate() + n)
  return formatDate(d)
}

/**
 * 由出发/返程时间锚点计算行程时间：
 * diff = 日期差；totalDays = diff+1；nights = max(0,diff)；fullDays = max(0,diff-1)。
 * diff<0（返程早于出发）时按一日游兜底，不产生负数。
 */
export function computeTripTime(depart: TimeAnchor, back: TimeAnchor): TripTimeSummary {
  const diff = dayDiff(depart.date, back.date)
  if (diff < 0) {
    return { totalDays: 1, nights: 0, fullDays: 0, dates: [depart.date] }
  }
  const totalDays = diff + 1
  const dates = Array.from({ length: totalDays }, (_, i) => addDays(depart.date, i))
  return {
    totalDays,
    nights: Math.max(0, diff),
    fullDays: Math.max(0, diff - 1),
    dates,
  }
}
