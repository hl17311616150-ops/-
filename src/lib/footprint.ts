import { loadArray, save } from '../storage/store'
import { K } from '../storage/keys'
import type { DiaryEntry, PhotoEntry, Trip } from '../types'
import { createPhotoEntry } from '../types'

/** 回收站自动清除阈值：超过该天数彻底物理删除 */
const RECYCLE_DAYS = 30

function isPhotoEntry(x: unknown): x is PhotoEntry {
  return (
    !!x &&
    typeof x === 'object' &&
    typeof (x as PhotoEntry).id === 'string' &&
    typeof (x as PhotoEntry).url === 'string'
  )
}

export function getVisited(): string[] {
  return loadArray(K.visited, (x): x is string => typeof x === 'string', [])
}

export function markVisited(destinationId: string): void {
  const v = getVisited()
  if (v.includes(destinationId)) return
  save(K.visited, [...v, destinationId])
}

export function unmarkVisited(destinationId: string): void {
  save(
    K.visited,
    getVisited().filter((x) => x !== destinationId),
  )
}

export function toggleVisited(destinationId: string): boolean {
  if (getVisited().includes(destinationId)) {
    unmarkVisited(destinationId)
    return false
  }
  markVisited(destinationId)
  return true
}

export function getPhotos(): PhotoEntry[] {
  return loadArray(K.photos, isPhotoEntry, [])
}

export function addPhoto(destinationId: string, url: string): void {
  save(K.photos, [...getPhotos(), createPhotoEntry(destinationId, url)])
}

export function removePhoto(photoId: string): void {
  save(
    K.photos,
    getPhotos().filter((p) => p.id !== photoId),
  )
}

// —— 已出发行程档案（足迹·回顾）——
function isTrip(x: unknown): x is Trip {
  return (
    !!x &&
    typeof x === 'object' &&
    typeof (x as Trip).id === 'string' &&
    Array.isArray((x as Trip).waypoints) &&
    (x as Trip).departed === true
  )
}

export function getArchivedTrips(): Trip[] {
  return loadArray(K.trips, isTrip, [])
}

/** 行程"已完成出行"时存档（足迹只读回顾） */
export function addArchivedTrip(trip: Trip): void {
  if (!trip.departed) return
  const list = getArchivedTrips()
  if (list.some((t) => t.id === trip.id)) return
  save(K.trips, [trip, ...list])
}

export function removeArchivedTrip(tripId: string): void {
  save(
    K.trips,
    getArchivedTrips().filter((t) => t.id !== tripId),
  )
}

/** 替换归档列表中某条行程（日记增删改共用） */
function updateArchivedTrip(tripId: string, mutate: (t: Trip) => Trip): void {
  const list = getArchivedTrips()
  const idx = list.findIndex((t) => t.id === tripId)
  if (idx === -1) return
  list[idx] = mutate(list[idx])
  save(K.trips, list)
}

/** 取行程的日记数组（旧归档数据可能缺 diary 字段，容错为空） */
function diaryOf(t: Trip): DiaryEntry[] {
  return Array.isArray(t.diary) ? t.diary : []
}

/** 在归档行程上追加一条日记（按 createdAt 升序保持时间轴） */
export function addTripDiaryEntry(tripId: string, entry: DiaryEntry): void {
  updateArchivedTrip(tripId, (t) => {
    const diary = [...diaryOf(t), entry].sort((a, b) => a.createdAt - b.createdAt)
    return { ...t, diary, updatedAt: Date.now() }
  })
}

/** 编辑归档行程上某条日记 */
export function updateTripDiaryEntry(tripId: string, entryId: string, patch: Partial<Pick<DiaryEntry, 'text' | 'photoIds' | 'nodeId'>>): void {
  updateArchivedTrip(tripId, (t) => {
    const diary = diaryOf(t).map((e) => (e.id === entryId ? { ...e, ...patch, updatedAt: Date.now() } : e))
    return { ...t, diary, updatedAt: Date.now() }
  })
}

/** 删除归档行程上某条日记（照片引用随条目删除，相册库照片保留） */
export function removeTripDiaryEntry(tripId: string, entryId: string): void {
  updateArchivedTrip(tripId, (t) => {
    const diary = diaryOf(t).filter((e) => e.id !== entryId)
    return { ...t, diary, updatedAt: Date.now() }
  })
}

// —— v1.15 足迹回收站（软删除，30 天自动清）——
export type RecycledTrip = Trip & { deletedAt: number }

function isRecycledTrip(x: unknown): x is RecycledTrip {
  return isTrip(x) && typeof (x as RecycledTrip).deletedAt === 'number'
}

export function getRecycledTrips(): RecycledTrip[] {
  return loadArray(K.recycled, isRecycledTrip, [])
}

/** 删除归档行程 → 移入回收站（加 deletedAt），足迹列表即时消失 */
export function recycleArchivedTrip(tripId: string): void {
  const list = getArchivedTrips()
  const target = list.find((t) => t.id === tripId)
  if (!target) return
  save(K.trips, list.filter((t) => t.id !== tripId))
  const recycled = getRecycledTrips()
  if (recycled.some((t) => t.id === tripId)) return
  save(K.recycled, [{ ...target, deletedAt: Date.now() }, ...recycled])
}

/** 恢复回收站行程回足迹（去 deletedAt，内容含日记完整保留） */
export function restoreRecycledTrip(tripId: string): void {
  const recycled = getRecycledTrips()
  const target = recycled.find((t) => t.id === tripId)
  if (!target) return
  save(K.recycled, recycled.filter((t) => t.id !== tripId))
  const { deletedAt: _del, ...trip } = target
  const list = getArchivedTrips()
  if (list.some((t) => t.id === tripId)) return
  save(K.trips, [trip, ...list])
}

/** 彻底删除回收站项（物理删，不可恢复） */
export function purgeRecycledTrip(tripId: string): void {
  save(
    K.recycled,
    getRecycledTrips().filter((t) => t.id !== tripId),
  )
}

/**
 * 惰性清理回收站中超过 30 天前删除的项（now 可注入以便测试）。
 * 在启动 / 打开足迹页时调用，不在后台跑定时器。
 */
export function sweepRecycledTrips(now: number = Date.now()): void {
  const cutoff = now - RECYCLE_DAYS * 24 * 60 * 60 * 1000
  const left = getRecycledTrips().filter((t) => t.deletedAt > cutoff)
  save(K.recycled, left)
}
