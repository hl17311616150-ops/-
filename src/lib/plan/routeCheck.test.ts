import { expect, it } from 'vitest'
import { checkRoute } from './routeCheck'
import type { TripTimeSummary } from '../time'

const time = (totalDays = 6): TripTimeSummary => ({ totalDays, nights: totalDays - 1, fullDays: totalDays - 2, dates: [] })

it('宏村+黟县同时出现 → 地理重叠需决定', () => {
  const r = checkRoute(['长沙','黟县','宏村','呈坎'], time())
  const ov = r.filter((x) => x.kind === 'overlap')
  expect(ov.some((x) => x.child === '宏村' && x.parent === '黟县')).toBe(true)
  expect(ov.every((x) => x.level === 'decide')).toBe(true)
})

it('多个子点都在黟县，逐对生成不遗漏（Review Focus #5）', () => {
  const r = checkRoute(['黟县','西递','宏村','塔川'], time())
  const kids = r.filter((x) => x.kind === 'overlap').map((x) => x.child)
  expect(kids).toEqual(expect.arrayContaining(['西递','宏村','塔川']))
})

it('无父子同现 → 无 overlap，含顺序/时间 info', () => {
  const r = checkRoute(['长沙','景德镇','呈坎'], time())
  expect(r.some((x) => x.kind === 'overlap')).toBe(false)
  expect(r.some((x) => x.kind === 'order')).toBe(true)
  expect(r.some((x) => x.kind === 'time')).toBe(true)
})

it('time 为 null / undefined 时跳过，不生成 time 检查', () => {
  const nullR = checkRoute(['长沙','景德镇','呈坎'], null)
  expect(nullR.some((x) => x.kind === 'time')).toBe(false)
  expect(nullR.some((x) => x.kind === 'order')).toBe(true)

  const undefinedR = checkRoute(['长沙','景德镇','呈坎'], undefined)
  expect(undefinedR.some((x) => x.kind === 'time')).toBe(false)
})

it('单日里程 >500km 提示偏赶（仅告知）；刚好 500km 不判偏赶', () => {
  const rushed = checkRoute(['长沙','黟县'], time())
  const rushedTime = rushed.find((x) => x.kind === 'time')
  expect(rushedTime?.level).toBe('info')
  expect(rushedTime?.title).toContain('偏赶')

  // 长沙→景德镇 = 500km，阈值为 >500，不应判为偏赶
  const ok = checkRoute(['长沙','景德镇'], time())
  const okTime = ok.find((x) => x.kind === 'time')
  expect(okTime?.title).not.toContain('偏赶')
})
