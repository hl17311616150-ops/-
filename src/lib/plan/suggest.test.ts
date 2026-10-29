import { expect, it } from 'vitest'
import { suggest, applySuggestions } from './suggest'
import type { Suggestion } from './suggest'
import { buildPlan } from './buildPlan'
import type { DayPlan, PlanningDraft } from '../../types'
import { createDraft } from '../planningDraft'

function made(): { days: DayPlan[]; draft: PlanningDraft } {
  const d: PlanningDraft = {
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
  }
  return { days: buildPlan(d), draft: d }
}

it('生成建议，含节奏（自驾长+当天多景点）', () => {
  const { days, draft } = made()
  const s = suggest(days, draft)
  expect(s.some((x) => x.kind === 'pace')).toBe(true)
  expect(s.some((x) => x.kind === 'route')).toBe(true)
})

it('采纳补住宿：缺住宿的晚被填上（Review #5）', () => {
  const { days, draft } = made()
  const noStay = days.map((d) => ({ ...d, stay: undefined }))
  const s = suggest(noStay, draft).map((x) => (x.kind === 'stay' ? { ...x, status: 'accepted' as const } : x))
  const out = applySuggestions(noStay, s, draft)
  expect(out[0].stay).toBeTruthy()
})

it('采纳节奏：自驾日 POI 被移走（Review #5）', () => {
  const { days, draft } = made()
  const driveDay = days.findIndex((d) => d.blocks.some((b) => b.drive))
  const before = days[driveDay].blocks.filter((b) => !b.drive).length
  const s = suggest(days, draft).map((x) => (x.kind === 'pace' ? { ...x, status: 'accepted' as const } : x))
  const out = applySuggestions(days, s, draft)
  const after = out[driveDay].blocks.filter((b) => !b.drive).length
  expect(after).toBeLessThan(before)
})

it('默认行程恰好 3 条建议：pace→1、route→3、stay(b)→1 推荐 stay-jd-2', () => {
  const { days, draft } = made()
  const s = suggest(days, draft)
  expect(s).toHaveLength(3)

  const pace = s.find((x) => x.kind === 'pace')
  const route = s.find((x) => x.kind === 'route')
  const stay = s.find((x) => x.kind === 'stay')

  expect(pace?.targetDayIndex).toBe(1)
  expect(route?.targetDayIndex).toBe(3)
  expect(stay?.targetDayIndex).toBe(1)
  expect(stay?.stayId).toBe('stay-jd-2')

  // 长沙无“景区内”选项、黟县首晚已含“景区内”，均不产生 stay(b)；默认数据也无缺住宿
  expect(s.filter((x) => x.kind === 'stay')).toHaveLength(1)
})

it('节奏文案天编号为 1 基（Day2），targetDayIndex 保持 0 基（Review #1）', () => {
  const { days, draft } = made()
  const pace = suggest(days, draft).find((x) => x.kind === 'pace')
  expect(pace?.text).toMatch(/^Day2 /)
  // 功能字段仍为 0 基下标，不随展示文案变化
  expect(pace?.targetDayIndex).toBe(1)
})

it('景区内住宿配套按真实标签动态组装：含「景区内、含早」，不虚构「可停车」（Review #1）', () => {
  const { days, draft } = made()
  const stay = suggest(days, draft).find((x) => x.kind === 'stay')
  expect(stay?.stayId).toBe('stay-jd-2')
  expect(stay?.text).toContain('景区内')
  expect(stay?.text).toContain('含早')
  expect(stay?.text).not.toContain('可停车')
})

it('建议 id 按生成顺序编号，初始状态均为 open', () => {
  const { days, draft } = made()
  const s = suggest(days, draft)
  expect(s.map((x) => x.id)).toEqual(['sug-pace-0', 'sug-route-1', 'sug-stay-2'])
  expect(s.every((x) => x.status === 'open')).toBe(true)
})

it('采纳景区内住宿：目标晚换成 stay-jd-2、changed=true，入参不被修改', () => {
  const { days, draft } = made()
  const s = suggest(days, draft).map((x) => (x.kind === 'stay' ? { ...x, status: 'accepted' as const } : x))
  const originalName = days[1].stay?.name
  const originalChanged = days[1].stay?.changed

  const out = applySuggestions(days, s, draft)
  expect(out[1].stay?.stayId).toBe('stay-jd-2')
  expect(out[1].stay?.name).toBe('古窑·瓷都民宿')
  expect(out[1].stay?.changed).toBe(true)
  expect(out[1].stay?.tags).toContain('景区内')

  // 纯函数：原 dayPlans 保持原样
  expect(days[1].stay?.name).toBe(originalName)
  expect(days[1].stay?.changed).toBe(originalChanged)
})

it('采纳顺路：同片区连续晚统一为第一晚住宿，后续晚 changed=true，第一晚保持原值', () => {
  const { days, draft } = made()
  const s = suggest(days, draft).map((x) => (x.kind === 'route' ? { ...x, status: 'accepted' as const } : x))
  const out = applySuggestions(days, s, draft)

  // 黟县第一晚（index 3）保持原值；第二晚（index 4）复制第一晚住宿并标记 changed
  expect(out[3].stay?.changed).toBe(false)
  expect(out[4].stay?.changed).toBe(true)
  expect(out[4].stay?.location).toBe('黟县')
  expect(out[4].stay?.name).toBe(out[3].stay?.name)

  // 景德镇晚 location 不同即停止，不被波及
  expect(out[2].stay?.location).toBe('景德镇')
})

it('采纳节奏：最后一个 POI 块移到下一天，并保持上午→下午→晚上顺序', () => {
  const { days, draft } = made()
  const s = suggest(days, draft).map((x) => (x.kind === 'pace' ? { ...x, status: 'accepted' as const } : x))
  const out = applySuggestions(days, s, draft)

  // 自驾日（index 1）只剩陶溪川；古窑移到下一天（index 2）的 evening
  expect(out[1].blocks.filter((b) => !b.drive).map((b) => b.poiId)).toEqual(['jdz-taoxichuan'])
  const moved = out[2].blocks.find((b) => b.poiId === 'jdz-guyao')
  expect(moved?.period).toBe('evening')
})

it('open 状态建议不被采纳：住宿与景点块保持原样', () => {
  const { days, draft } = made()
  const s = suggest(days, draft)
  const out = applySuggestions(days, s, draft)
  expect(out[1].stay?.stayId).toBe('stay-jd-1')
  expect(out[1].blocks.filter((b) => !b.drive)).toHaveLength(2)
})

it('缺住宿全量采纳：0..4 晚被填上、changed=true，最后一天仍无住宿', () => {
  const { days, draft } = made()
  const noStay = days.map((d) => ({ ...d, stay: undefined }))
  const s = suggest(noStay, draft).map((x) => (x.kind === 'stay' ? { ...x, status: 'accepted' as const } : x))

  // 5 个缺住宿晚各产生一条 stay(a)；首晚无住宿，stay(b) 被跳过（不访问 undefined.tags）
  expect(s.filter((x) => x.kind === 'stay')).toHaveLength(5)

  const out = applySuggestions(noStay, s, draft)
  for (let i = 0; i < 5; i += 1) {
    expect(out[i].stay).toBeTruthy()
    expect(out[i].stay?.changed).toBe(true)
  }
  expect(out[5].stay).toBeUndefined()
  expect(out[1].stay?.location).toBe('景德镇')
  expect(out[3].stay?.location).toBe('黟县')
})

it('容错：目标晚 / 住宿不存在时安全跳过，不抛错', () => {
  const { draft } = made()
  const fake: DayPlan[] = [{ dayIndex: 0, date: '2026-11-08', blocks: [], stay: undefined }]
  const rogue: Suggestion[] = [
    { id: 'sug-stay-9', kind: 'stay', text: 'x', why: 'x', status: 'accepted', targetDayIndex: 99, stayId: 'nope' },
    { id: 'sug-route-9', kind: 'route', text: 'x', why: 'x', status: 'accepted', targetDayIndex: 99 },
    { id: 'sug-pace-9', kind: 'pace', text: 'x', why: 'x', status: 'accepted', targetDayIndex: 99 },
  ]
  const out = applySuggestions(fake, rogue, draft)
  expect(out).toHaveLength(1)
  expect(out[0].stay).toBeUndefined()
})

it('采纳节奏：自驾日为最后一天时，POI 回移到前一天并保持时段顺序', () => {
  const { draft } = made()
  const days: DayPlan[] = [
    { dayIndex: 0, date: 'd0', blocks: [{ period: 'morning', title: '上午安排' }], stay: undefined },
    {
      dayIndex: 1,
      date: 'd1',
      blocks: [
        { period: 'morning', title: '开车', drive: { from: 'A', to: 'B', distanceKm: 500, durationMin: 333 } },
        { period: 'afternoon', title: '景点甲' },
        { period: 'evening', title: '景点乙' },
      ],
      stay: undefined,
    },
  ]
  const s: Suggestion[] = [
    { id: 'sug-pace-0', kind: 'pace', text: 'x', why: 'x', status: 'accepted', targetDayIndex: 1 },
  ]
  const out = applySuggestions(days, s, draft)

  expect(out[1].blocks.filter((b) => !b.drive)).toHaveLength(1)
  expect(out[0].blocks.some((b) => b.title === '景点乙')).toBe(true)
  // 前一天按 morning → evening 时段顺序插入
  expect(out[0].blocks.map((b) => b.period)).toEqual(['morning', 'evening'])
})
