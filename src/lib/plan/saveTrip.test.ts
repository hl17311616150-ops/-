import { expect, it, beforeEach } from 'vitest'
import { draftToTrip, saveGeneratedTrip } from './saveTrip'
import { buildPlan } from './buildPlan'
import type { PlanningDraft, Trip } from '../../types'
import { createDraft } from '../planningDraft'
import { load } from '../../storage/store'
import { K } from '../../storage/keys'

beforeEach(() => {
  localStorage.clear()
})

it('转换：标题/天数/锚点/来源正确（draft → Trip），并落盘 K.trip', () => {
  const d: PlanningDraft = {
    ...createDraft(),
    depart: { date: '2026-11-08', period: 'morning' },
    back: { date: '2026-11-13', period: 'evening' },
    points: ['长沙', '景德镇', '黟县', '宏村', '呈坎'],
    pointGrouping: { 宏村: '黟县' },
    selectedPois: { 长沙: [], 景德镇: [], 黟县: [], 宏村: [], 呈坎: [] },
  }
  const plans = buildPlan(d)

  const trip = draftToTrip(d, plans)
  expect(trip.title).toBe('长沙→景德镇→黟县→呈坎 6日')
  expect(trip.totalDays).toBe(6)
  expect(trip.source).toBe('ai')
  expect(trip.departAnchor?.date).toBe('2026-11-08')
  expect(trip.dayPlans).toHaveLength(6)

  // 路线字段：出发点 = 首城，途经点 = 中间城，目的地 = 末城
  expect(trip.departDate).toBe('2026-11-08')
  expect(trip.startPoint).toBe('长沙')
  expect(trip.waypoints).toEqual(['景德镇', '黟县'])
  expect(trip.destinationId).toBe('呈坎')
  expect(trip.backAnchor?.date).toBe('2026-11-13')
  // 按天计划原样挂接（引用一致）
  expect(trip.dayPlans).toBe(plans)

  // 新行程状态：未出发、无日记、仅自己可见、时间戳已生成
  expect(trip.departed).toBe(false)
  expect(trip.departedAt).toBeNull()
  expect(trip.diary).toEqual([])
  expect(trip.visibility).toBe('self')
  expect(trip.createdAt).toBeGreaterThan(0)
  expect(trip.updatedAt).toBeGreaterThan(0)

  // saveGeneratedTrip：先转换再写入 K.trip，返回同一条 Trip
  const saved = saveGeneratedTrip(d, plans)
  expect(saved.source).toBe('ai')
  const persisted = load<Trip | null>(K.trip, null)
  expect(persisted).not.toBeNull()
  expect(persisted?.title).toBe('长沙→景德镇→黟县→呈坎 6日')
  expect(persisted?.dayPlans).toHaveLength(6)
  expect(persisted?.destinationId).toBe('呈坎')
})

it('容错：depart/back 为 null 时不抛错，出发日期与两个锚点均为 null', () => {
  const d: PlanningDraft = {
    ...createDraft(),
    depart: null,
    back: null,
    points: ['长沙'],
    pointGrouping: {},
    selectedPois: { 长沙: [] },
  }
  const plans = buildPlan(d)

  const trip = draftToTrip(d, plans)
  expect(trip.departDate).toBeNull()
  expect(trip.departAnchor).toBeNull()
  expect(trip.backAnchor).toBeNull()
})

it('容错：points 为空（无城市）时不抛错，路线字段安全兜底、标题以「日」结尾', () => {
  const d: PlanningDraft = {
    ...createDraft(),
    depart: null,
    back: null,
    points: [],
    pointGrouping: {},
    selectedPois: {},
  }
  const plans = buildPlan(d)

  const trip = draftToTrip(d, plans)
  expect(trip.startPoint).toBe('')
  expect(trip.waypoints).toEqual([])
  expect(trip.destinationId).toBeNull()
  expect(trip.title).toMatch(/日$/)
})
