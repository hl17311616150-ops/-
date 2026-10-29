import { expect, it } from 'vitest'
import { buildPlan, resolveCities } from './buildPlan'
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
})

it('首日含出发块、末日含返程块（Review #4）', () => {
  const days = buildPlan(draft({}))
  expect(days[0].blocks.some((b) => b.title.includes('出发'))).toBe(true)
  expect(days[5].blocks.some((b) => b.title === '返程')).toBe(true)
})

it('里程表查不到的城市切换，自驾段不报错（里程 0）', () => {
  const d = draft({ points: ['长沙', '黟县'], pointGrouping: {}, selectedPois: { 长沙: [], 黟县: [] } })
  const days = buildPlan(d)
  const block = days.find((x) => x.blocks.some((b) => b.drive))?.blocks.find((b) => b.drive)
  expect(block?.drive).toBeTruthy()
})
