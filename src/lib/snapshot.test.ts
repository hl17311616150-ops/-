import { beforeEach, describe, expect, it } from 'vitest'
import { exportTripSnapshot, getSnapshots, saveSnapshot } from './snapshot'
import { createTrip } from '../types'

beforeEach(() => {
  localStorage.clear()
})

/** 造一条带日记的已出发行程 */
function sampleTrip() {
  const t = createTrip()
  t.departed = true
  t.departedAt = 1700000000000
  t.startPoint = '广安'
  t.waypoints = ['dest_chengdu', 'dest_huaying']
  t.destinationId = 'dest_jiuzhaigou'
  t.totalDays = 3
  t.diary = [
    { id: 'd1', text: '山上的风很大', photoIds: ['photo_a', 'photo_b'], nodeId: 'wp_dest_chengdu', createdAt: 100, updatedAt: 200 },
    { id: 'd2', text: '到目的地了', photoIds: [], nodeId: 'dest_dest_jiuzhaigou', createdAt: 300, updatedAt: 400 },
  ]
  return t
}

describe('社区分享快照地基 snapshot', () => {
  it('exportTripSnapshot 生成完整不可变快照（字段齐全、路线拼接）', () => {
    const t = sampleTrip()
    const snap = exportTripSnapshot(t)
    expect(snap.tripId).toBe(t.id)
    expect(snap.title).toBe('广安 → 四川·成都 → 广安·华蓥山 → 四川·九寨沟')
    expect(snap.departedAt).toBe(1700000000000)
    expect(snap.totalDays).toBe(3)
    expect(snap.nodes.length).toBe(4)
    expect(snap.nodes[0]).toEqual({ key: 'start', type: 'start', label: '广安' })
    expect(snap.nodes[3]).toEqual({ key: 'dest_dest_jiuzhaigou', type: 'destination', label: '四川·九寨沟' })
    expect(snap.diary).toHaveLength(2)
    // 日记映射去掉 updatedAt，只留分享所需的可追溯字段
    expect(snap.diary[0]).toEqual({ text: '山上的风很大', photoIds: ['photo_a', 'photo_b'], nodeId: 'wp_dest_chengdu', createdAt: 100 })
    expect(typeof snap.exportedAt).toBe('number')
  })

  it('快照与 live 解耦：导出后修改 live 行程/日记，快照不变', () => {
    const t = sampleTrip()
    const snap = exportTripSnapshot(t)
    // 改 live 行程的路线与日记、照片引用
    t.waypoints = []
    t.destinationId = null
    t.diary[0].text = '被改掉的文字'
    t.diary[0].photoIds = []
    t.diary.push({ id: 'd3', text: '新的一条', photoIds: [], nodeId: null, createdAt: 500, updatedAt: 500 })
    // 快照仍是导出时的内容（深拷贝）
    expect(snap.title).toBe('广安 → 四川·成都 → 广安·华蓥山 → 四川·九寨沟')
    expect(snap.diary).toHaveLength(2)
    expect(snap.diary[0].text).toBe('山上的风很大')
    expect(snap.diary[0].photoIds).toEqual(['photo_a', 'photo_b'])
  })

  it('saveSnapshot / getSnapshots 独立存储于 travel:v1:snapshots，可回读', () => {
    const snap = exportTripSnapshot(sampleTrip())
    saveSnapshot(snap)
    const all = getSnapshots()
    expect(all.length).toBe(1)
    expect(all[0].tripId).toBe(snap.tripId)
    // 存在独立 key，不与 live 行程（trip/trips）混用
    expect(localStorage.getItem('travel:v1:snapshots')).not.toBeNull()
    expect(localStorage.getItem('travel:v1:trip')).toBeNull()
  })
})
