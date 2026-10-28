import { loadObject, save } from '../storage/store'
import { K } from '../storage/keys'
import type { DiaryEntry, Trip } from '../types'
import { createTrip } from '../types'
import { DEFAULT_START } from '../data/starts'

export function getTrip(): Trip {
  const t = loadObject<Trip>(
    K.trip,
    (o) => typeof o.departDate === 'string' || o.departDate === null,
    null,
  )
  if (t) return t
  const fresh = createTrip()
  save(K.trip, fresh)
  return fresh
}

function persist(trip: Trip): void {
  trip.updatedAt = Date.now()
  save(K.trip, trip)
}

export function setDepartDate(date: string | null): void {
  const t = getTrip()
  t.departDate = date
  persist(t)
}

export function setTotalDays(n: number): void {
  const t = getTrip()
  t.totalDays = Math.max(1, Math.floor(n))
  persist(t)
}

export function setStartPoint(city: string): void {
  const t = getTrip()
  t.startPoint = city
  persist(t)
}

export function setDestination(destinationId: string | null): void {
  const t = getTrip()
  t.destinationId = destinationId
  persist(t)
}

export function addWaypoint(destinationId: string): void {
  const t = getTrip()
  if (!t.waypoints.includes(destinationId)) {
    t.waypoints.push(destinationId)
  }
  persist(t)
}

export function removeWaypoint(destinationId: string): void {
  const t = getTrip()
  t.waypoints = t.waypoints.filter((id) => id !== destinationId)
  persist(t)
}

export function setIntent(intent: string): void {
  const t = getTrip()
  t.intentTags = intent ? [intent] : []
  persist(t)
}

/** 标记行程已出发（进入路线页）；品牌页据此显示"继续当前行程"回路线页 */
export function setDeparted(departed: boolean): void {
  const t = getTrip()
  t.departed = departed
  // 首次出发时记录 departedAt（照片墙据此取"最近出行"）；离开不重置
  if (departed && !t.departedAt) t.departedAt = Date.now()
  persist(t)
}

/** 取当前行程的日记数组（旧数据可能缺 diary，容错为空） */
function diaryOf(t: Trip): DiaryEntry[] {
  return Array.isArray(t.diary) ? t.diary : []
}

/** 当前行程（进行中）追加一条日记 */
export function addTripDiary(entry: DiaryEntry): void {
  const t = getTrip()
  t.diary = [...diaryOf(t), entry].sort((a, b) => a.createdAt - b.createdAt)
  persist(t)
}

/** 当前行程编辑某条日记 */
export function updateTripDiary(entryId: string, patch: Partial<Pick<DiaryEntry, 'text' | 'photoIds' | 'nodeId'>>): void {
  const t = getTrip()
  t.diary = diaryOf(t).map((e) => (e.id === entryId ? { ...e, ...patch } : e))
  persist(t)
}

/** 当前行程删除某条日记 */
export function removeTripDiary(entryId: string): void {
  const t = getTrip()
  t.diary = diaryOf(t).filter((e) => e.id !== entryId)
  persist(t)
}

/** 行程是否"确定"：出发日期 + 总天数 + 出发点 + 最终目的地 都已填（可出发） */
export function canDepart(trip: Trip): boolean {
  return !!trip.departDate && trip.totalDays > 0 && !!trip.startPoint && !!trip.destinationId
}

/** 清空当前行程（"新的规划"/"清空"后调用，可规划新行程）；新行程直接带默认出发点，出发按钮不因此消失 */
export function clearActive(): void {
  const fresh = createTrip()
  fresh.startPoint = DEFAULT_START
  save(K.trip, fresh)
}

/** 把给定行程设为当前行程（待出行"继续规划"加载快照回 active） */
export function replaceActive(trip: Trip): void {
  save(K.trip, trip)
}

export type RouteNodeType = 'start' | 'waypoint' | 'destination'
export interface RouteNode {
  key: string
  type: RouteNodeType
  label?: string
  destinationId?: string
}

/** 总路线节点链：出发点 → 途经点 → 目的地（供示意图/路线页渲染） */
export function routeNodes(trip: Trip): RouteNode[] {
  const nodes: RouteNode[] = []
  if (trip.startPoint) {
    nodes.push({ key: 'start', type: 'start', label: trip.startPoint })
  }
  for (const wp of trip.waypoints) {
    nodes.push({ key: `wp_${wp}`, type: 'waypoint', destinationId: wp })
  }
  if (trip.destinationId) {
    nodes.push({ key: `dest_${trip.destinationId}`, type: 'destination', destinationId: trip.destinationId })
  }
  return nodes
}
