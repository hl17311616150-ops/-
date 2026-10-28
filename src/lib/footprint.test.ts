import { beforeEach, describe, expect, it } from 'vitest'
import {
  addArchivedTrip,
  addPhoto,
  addTripDiaryEntry,
  getArchivedTrips,
  getPhotos,
  getRecycledTrips,
  getVisited,
  markVisited,
  purgeRecycledTrip,
  recycleArchivedTrip,
  removeArchivedTrip,
  removePhoto,
  removeTripDiaryEntry,
  restoreRecycledTrip,
  sweepRecycledTrips,
  unmarkVisited,
  updateTripDiaryEntry,
} from './footprint'
import { createDiaryEntry, createTrip } from '../types'

beforeEach(() => {
  localStorage.clear()
})

/** 造一条已出发行程 */
function departedTrip(id = 'trip_1', at = 1000): ReturnType<typeof createTrip> {
  const t = createTrip()
  t.id = id
  t.departed = true
  t.departedAt = at
  t.destinationId = 'dest_1'
  return t
}

describe('个人空间 footprint', () => {
  it('初始无足迹、无照片', () => {
    expect(getVisited()).toEqual([])
    expect(getPhotos()).toEqual([])
  })

  it('markVisited 记录去过，unmarkVisited 移除', () => {
    markVisited('a')
    markVisited('b')
    expect(getVisited()).toEqual(['a', 'b'])
    unmarkVisited('a')
    expect(getVisited()).toEqual(['b'])
  })

  it('重复标记去重', () => {
    markVisited('a')
    markVisited('a')
    expect(getVisited()).toEqual(['a'])
  })

  it('addPhoto 记录照片，removePhoto 删除', () => {
    addPhoto('a', 'data:image/png;base64,x')
    addPhoto('a', 'data:image/png;base64,y')
    const photos = getPhotos()
    expect(photos.length).toBe(2)
    expect(photos.every((p) => p.visibility === 'self')).toBe(true)
    removePhoto(photos[0].id)
    expect(getPhotos().length).toBe(1)
  })

  it('addArchivedTrip 记录已出发行程（含 departedAt 与日记）', () => {
    const t = departedTrip()
    t.diary = [{ id: 'd1', text: '山上的风很大', photoIds: [], nodeId: null, createdAt: 1, updatedAt: 1 }]
    addArchivedTrip(t)
    const a = getArchivedTrips()
    expect(a.length).toBe(1)
    expect(a[0].departedAt).toBe(1000)
    expect(a[0].diary.length).toBe(1)
  })

  it('addTripDiaryEntry 在归档行程上追加一条日记，并更新时间戳', () => {
    addArchivedTrip(departedTrip())
    const entry = createDiaryEntry()
    entry.text = '到华蓥山了'
    entry.nodeId = 'dest_1'
    addTripDiaryEntry('trip_1', entry)
    const a = getArchivedTrips()
    expect(a[0].diary).toHaveLength(1)
    expect(a[0].diary[0].text).toBe('到华蓥山了')
    expect(a[0].diary[0].nodeId).toBe('dest_1')
  })

  it('updateTripDiaryEntry 编辑归档行程上某条日记', () => {
    addArchivedTrip(departedTrip())
    const entry = createDiaryEntry()
    entry.text = '初稿'
    addTripDiaryEntry('trip_1', entry)
    updateTripDiaryEntry('trip_1', entry.id, { text: '改过的文字' })
    const a = getArchivedTrips()
    expect(a[0].diary[0].text).toBe('改过的文字')
  })

  it('removeTripDiaryEntry 删除归档行程上某条日记，照片引用一并清除', () => {
    addArchivedTrip(departedTrip())
    const entry = createDiaryEntry()
    entry.text = '要删的'
    entry.photoIds = ['photo_x']
    addTripDiaryEntry('trip_1', entry)
    removeTripDiaryEntry('trip_1', entry.id)
    const a = getArchivedTrips()
    expect(a[0].diary).toHaveLength(0)
  })

  it('removeArchivedTrip 删除归档行程时，其日记一并删除', () => {
    addArchivedTrip(departedTrip())
    removeArchivedTrip('trip_1')
    expect(getArchivedTrips()).toHaveLength(0)
  })

  // —— v1.15 回收站 ——
  it('recycleArchivedTrip 把归档行程移入回收站并带 deletedAt', () => {
    const t = departedTrip()
    t.diary = [{ id: 'd1', text: '记录', photoIds: [], nodeId: null, createdAt: 1, updatedAt: 1 }]
    addArchivedTrip(t)
    recycleArchivedTrip('trip_1')
    expect(getArchivedTrips()).toHaveLength(0)
    const r = getRecycledTrips()
    expect(r.length).toBe(1)
    expect(r[0].id).toBe('trip_1')
    expect(typeof r[0].deletedAt).toBe('number')
    expect(r[0].diary).toHaveLength(1) // 日记随行程进回收站，不丢
  })

  it('restoreRecycledTrip 恢复回收站行程回足迹（去 deletedAt、含日记）', () => {
    const t = departedTrip()
    t.diary = [{ id: 'd1', text: '记录', photoIds: [], nodeId: null, createdAt: 1, updatedAt: 1 }]
    addArchivedTrip(t)
    recycleArchivedTrip('trip_1')
    restoreRecycledTrip('trip_1')
    expect(getRecycledTrips()).toHaveLength(0)
    const a = getArchivedTrips()
    expect(a.length).toBe(1)
    expect('deletedAt' in a[0]).toBe(false)
    expect(a[0].diary).toHaveLength(1)
  })

  it('purgeRecycledTrip 彻底删除回收站项', () => {
    addArchivedTrip(departedTrip())
    recycleArchivedTrip('trip_1')
    purgeRecycledTrip('trip_1')
    expect(getRecycledTrips()).toHaveLength(0)
    expect(getArchivedTrips()).toHaveLength(0)
  })

  it('sweepRecycledTrips 删除超过 30 天的回收站项，30 天内保留（边界可注入 now）', () => {
    addArchivedTrip(departedTrip('old'))
    recycleArchivedTrip('old')
    addArchivedTrip(departedTrip('recent'))
    recycleArchivedTrip('recent')
    const now = 10_000_000_000
    const dayMs = 24 * 60 * 60 * 1000
    // old: deletedAt 距今 31 天 → 清；recent: deletedAt 距今 29 天 → 留
    const oldDeleted = now - 31 * dayMs
    const recentDeleted = now - 29 * dayMs
    // 手动改写两条的 deletedAt 以测边界
    const all = getRecycledTrips()
    const patched = all.map((t) => ({ ...t, deletedAt: t.id === 'old' ? oldDeleted : recentDeleted }))
    localStorage.setItem('travel:v1:recycled', JSON.stringify(patched))
    sweepRecycledTrips(now)
    const left = getRecycledTrips()
    expect(left.map((t) => t.id)).toEqual(['recent'])
  })
})
