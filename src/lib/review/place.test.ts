import { describe, expect, it } from 'vitest'
import { formatEntryDate, formatFullscreenTime, resolvePlace } from './place'

describe('resolvePlace', () => {
  it('已知 POI id 返回 point/name', () => {
    expect(resolvePlace('hongcun-hongcun')).toEqual({ point: '宏村', name: '宏村（南湖·月沼）' })
    expect(resolvePlace('yixian-xidi')).toEqual({ point: '黟县', name: '西递古村' })
  })
  it('nodeId 为 null 或未知 id 返回 null（不抛错）', () => {
    expect(resolvePlace(null)).toBeNull()
    expect(resolvePlace('not-exist')).toBeNull()
  })
})

describe('时间格式化', () => {
  // 本地时区构造，断言不依赖 toLocaleString 的环境差异
  const ts = new Date(2026, 9, 10, 7, 20).getTime()
  it('formatEntryDate 输出「M月D日」', () => {
    expect(formatEntryDate(ts)).toBe('10月10日')
  })
  it('formatFullscreenTime 输出「M月D日 HH:mm」（补零）', () => {
    expect(formatFullscreenTime(ts)).toBe('10月10日 07:20')
  })
})
