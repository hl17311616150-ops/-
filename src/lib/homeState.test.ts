import { expect, it, beforeEach } from 'vitest'
import { getHomeState } from './homeState'
import { saveDraft, createDraft } from './planningDraft'
import { save } from '../storage/store'
import { K } from '../storage/keys'
import type { DayPlan, Trip } from '../types'
import { createTrip } from '../types'

beforeEach(() => {
  localStorage.clear()
})

function aiTrip(over: Partial<Trip> = {}): Trip {
  return { ...createTrip(), source: 'ai', title: '皖南古村 6 日', totalDays: 6, dayPlans: [{} as DayPlan], ...over }
}

it('无草稿无行程：fresh', () => {
  expect(getHomeState().kind).toBe('fresh')
})

it('草稿 step=points：draft 且 hint 正确', () => {
  const d = createDraft(); d.step = 'points'; saveDraft(d)
  const s = getHomeState()
  expect(s).toMatchObject({ kind: 'draft', stepLabel: '选景点' })
  if (s.kind === 'draft') expect(s.hint).toBe('上次规划到“选景点”，还差一步')
})

it('草稿 step=time / route 标签正确', () => {
  const t = createDraft(); t.step = 'time'; saveDraft(t)
  expect(getHomeState()).toMatchObject({ kind: 'draft', stepLabel: '选时间' })
  const r = createDraft(); r.step = 'route'; saveDraft(r)
  expect(getHomeState()).toMatchObject({ kind: 'draft', stepLabel: '确认路线' })
})

it('草稿 step=result 不算草稿；有 AI 行程则 generated', () => {
  const d = createDraft(); d.step = 'result'; saveDraft(d)
  save(K.trip, aiTrip())
  const s = getHomeState()
  expect(s).toMatchObject({ kind: 'generated', title: '皖南古村 6 日' })
  if (s.kind === 'generated') expect(s.hint).toBe('你有一份“皖南古村 6 日”')
})

it('source=self 的默认行程不判为 generated', () => {
  save(K.trip, createTrip())
  expect(getHomeState().kind).toBe('fresh')
})

it('source=ai 但 dayPlans 为空不判为 generated', () => {
  save(K.trip, aiTrip({ dayPlans: [] }))
  expect(getHomeState().kind).toBe('fresh')
})

it('草稿优先于已生成行程', () => {
  save(K.trip, aiTrip())
  const d = createDraft(); d.step = 'time'; saveDraft(d)
  expect(getHomeState().kind).toBe('draft')
})
