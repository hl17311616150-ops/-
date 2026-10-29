import { expect, it } from 'vitest'
import { buildPlan, resolveCities, allocateDays } from './buildPlan'
import { createDraft } from '../planningDraft'
import type { PlanningDraft } from '../../types'

function draft(over: Partial<PlanningDraft>): PlanningDraft {
  return {
    ...createDraft(),
    depart: { date: '2026-11-08', period: 'morning' },
    back: { date: '2026-11-13', period: 'evening' },
    points: ['长沙', '景德镇', '黟县', '宏村', '呈坎'],
    pointGrouping: { 宏村: '黟县' },
    selectedPois: {
      长沙: ['changsha-yuelushan'],
      景德镇: ['jdz-taoxichuan', 'jdz-guyao'],
      黟县: ['yixian-xidi'],
      宏村: ['hongcun-hongcun'],
      呈坎: ['chengkan-chengkan'],
    },
    ...over,
  }
}

it('城市合并：宏村并入黟县，4 城且 POI 不丢（Review #1）', () => {
  const cities = resolveCities(draft({}))
  expect(cities.map((c) => c.city)).toEqual(['长沙', '景德镇', '黟县', '呈坎'])
  expect(cities.find((c) => c.city === '黟县')?.subPoints).toEqual(['黟县', '宏村'])

  // 并入黟县的宏村 POI 与黟县自身 POI 都必须保留在最终行程块中
  const days = buildPlan(draft({}))
  const poiIds = days
    .flatMap((d) => d.blocks.map((b) => b.poiId))
    .filter((v): v is string => Boolean(v))
  expect(poiIds).toContain('hongcun-hongcun')
  expect(poiIds).toContain('yixian-xidi')
})

it('生成 6 天、5 晚住宿，住宿落在当天城市（Review #2）', () => {
  const days = buildPlan(draft({}))
  expect(days).toHaveLength(6)
  const stays = days.slice(0, 5).map((d) => d.stay).filter(Boolean)
  expect(stays).toHaveLength(5)
  expect(days[0].stay?.location).toBe('长沙')
})

it('城市切换生成自驾段，里程可查（Review #3）', () => {
  const days = buildPlan(draft({}))
  const drive = days.find((d) => d.blocks.some((b) => b.drive))
  const block = drive?.blocks.find((b) => b.drive)
  expect(block?.drive?.from).toBe('长沙')
  expect(block?.drive?.to).toBe('景德镇')
  expect(block?.drive?.distanceKm).toBe(500)
  // 时长公式 round(km / 90 * 60)：500 / 90 * 60 ≈ 333.33 → 333 分钟
  expect(block?.drive?.durationMin).toBe(333)
})

it('首日含出发块、末日含返程块（Review #4）', () => {
  const days = buildPlan(draft({}))
  expect(days[0].blocks.some((b) => b.title.includes('出发'))).toBe(true)
  expect(days[5].blocks.some((b) => b.title === '返程')).toBe(true)
})

it('里程表查不到的城市切换，自驾段不报错（里程与时长记 0）', () => {
  // 长沙→呈坎 直查、反查均不在里程表内，必然走 null 分支
  const d = draft({ points: ['长沙', '呈坎'], pointGrouping: {}, selectedPois: { 长沙: [], 呈坎: [] } })
  const days = buildPlan(d)
  const block = days.find((x) => x.blocks.some((b) => b.drive))?.blocks.find((b) => b.drive)
  expect(block?.drive).toBeTruthy()
  expect(block?.drive?.distanceKm).toBe(0)
  expect(block?.drive?.durationMin).toBe(0)
  expect(block?.title).toContain('自驾前往')
})

it('allocateDays：贪心分配 长沙1 / 景德镇2 / 黟县2 / 呈坎1（Review #5）', () => {
  const cities = resolveCities(draft({}))
  expect(allocateDays(cities, 6, draft({}))).toEqual([1, 2, 2, 1])
})

it('allocateDays：总天数不足（R<0）时保持最少天数，不裁剪 POI', () => {
  // 四城各 3 个 POI → 最少均为 2 天（最少总和 8）；给定 totalDays=1，R<0 不裁剪
  const d = draft({
    points: ['长沙', '景德镇', '黟县', '呈坎'],
    pointGrouping: {},
    selectedPois: {
      长沙: ['changsha-yuelushan', 'changsha-juzizhou', 'changsha-taipingjie'],
      景德镇: ['jdz-taoxichuan', 'jdz-guyao', 'jdz-yuyaochang'],
      黟县: ['yixian-xidi', 'yixian-nanping', 'yixian-pingshan'],
      呈坎: ['chengkan-chengkan', 'chengkan-baolunge', 'chengkan-luoshi-citang'],
    },
  })
  const cities = resolveCities(d)
  const alloc = allocateDays(cities, 1, d)
  expect(alloc).toEqual([2, 2, 2, 2])
  // 分配天数之和等于最少天数总和（8），未被压缩
  expect(alloc.reduce((sum, n) => sum + n, 0)).toBe(8)
})
