import { describe, expect, it } from 'vitest'
import { addDays, computeTripTime, dayDiff } from './time'

describe('time', () => {
  it('dayDiff 计算两个日期相差天数', () => {
    expect(dayDiff('2026-11-08', '2026-11-13')).toBe(5)
  })
  it('addDays 正确顺延（含跨月跨年）', () => {
    expect(addDays('2026-11-08', 5)).toBe('2026-11-13')
    expect(addDays('2026-12-31', 2)).toBe('2027-01-02') // Review Focus #1
  })
  it('computeTripTime 8号上午出发、13号晚上返程 = 6天5晚、4完整日', () => {
    const s = computeTripTime({ date: '2026-11-08', period: 'morning' }, { date: '2026-11-13', period: 'evening' })
    expect(s.totalDays).toBe(6)
    expect(s.nights).toBe(5)
    expect(s.fullDays).toBe(4)
    expect(s.dates).toEqual(['2026-11-08','2026-11-09','2026-11-10','2026-11-11','2026-11-12','2026-11-13'])
  })
  it('同日出发返程 = 一日游（1天0晚0完整日）', () => {
    const s = computeTripTime({ date: '2026-11-08', period: 'morning' }, { date: '2026-11-08', period: 'evening' })
    expect(s).toMatchObject({ totalDays: 1, nights: 0, fullDays: 0 })
  })
  it('返程早于出发时不产生负数（Review Focus #2）', () => {
    const s = computeTripTime({ date: '2026-11-13', period: 'morning' }, { date: '2026-11-08', period: 'evening' })
    expect(s.nights).toBeGreaterThanOrEqual(0)
    expect(s.fullDays).toBeGreaterThanOrEqual(0)
  })
})
