import { expect, it } from 'vitest'
import { checkRoute, pruneGrouping } from './routeCheck'
import type { TripTimeSummary } from '../time'

const time = (totalDays = 6): TripTimeSummary => ({ totalDays, nights: totalDays - 1, fullDays: totalDays - 2, dates: [] })

it('宏村+黟县同时出现 → 地理重叠需决定', () => {
  const r = checkRoute(['长沙','黟县','宏村','呈坎'], time())
  const ov = r.filter((x) => x.kind === 'overlap')
  expect(ov).toHaveLength(1)
  const hit = ov[0]
  expect(hit.child).toBe('宏村')
  expect(hit.parent).toBe('黟县')
  expect(hit.level).toBe('decide')
  expect(hit.title).toBe('宏村在黟县境内')
  expect(hit.detail).toBe('建议作为黟县重点村安排、不另算城市、想去的点都保留')
})

it('顺序一致 → 精确标题“当前点顺序无明显绕路”', () => {
  const r = checkRoute(['长沙','景德镇'], time())
  const order = r.find((x) => x.kind === 'order')
  expect(order?.level).toBe('info')
  expect(order?.title).toBe('当前点顺序无明显绕路')
})

it('顺序不一致（呈坎先于黟县）→ 提示可能绕路', () => {
  const r = checkRoute(['呈坎','黟县'], time())
  const order = r.find((x) => x.kind === 'order')
  expect(order?.level).toBe('info')
  expect(order?.title).toContain('绕路')
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
  expect(okTime?.title).toBe('时间与路程匹配，节奏合理')
})

it('pruneGrouping：剔除不在新 points 内的孤儿 child，保留有效映射', () => {
  const grouping = { 宏村: '黟县', 西递: '黟县', 塔川: '黟县' }
  expect(pruneGrouping(['长沙', '黟县', '宏村', '呈坎'], grouping)).toEqual({ 宏村: '黟县' })
})

it('pruneGrouping：points 空 / grouping 缺省或空对象时安全返回 {}', () => {
  expect(pruneGrouping([], { 宏村: '黟县' })).toEqual({})
  expect(pruneGrouping(['长沙'], undefined)).toEqual({})
  expect(pruneGrouping(['长沙'], null)).toEqual({})
  expect(pruneGrouping(['长沙'], {})).toEqual({})
})
