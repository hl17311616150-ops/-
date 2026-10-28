import { describe, expect, it } from 'vitest'
import { createChecklistItem, createDiaryEntry, createTrip, type ChecklistItem, type Trip } from './types'

describe('数据模型工厂', () => {
  it('createTrip 返回总路线骨架：id/时间戳/visibility 默认 self/空路线字段', () => {
    const trip: Trip = createTrip()
    expect(typeof trip.id).toBe('string')
    expect(trip.id.length).toBeGreaterThan(0)
    expect(typeof trip.createdAt).toBe('number')
    expect(typeof trip.updatedAt).toBe('number')
    expect(trip.visibility).toBe('self')
    expect(trip.departDate).toBeNull()
    expect(trip.totalDays).toBe(1)
    expect(trip.startPoint).toBe('')
    expect(trip.waypoints).toEqual([])
    expect(trip.destinationId).toBeNull()
    expect(Array.isArray(trip.intentTags)).toBe(true)
    expect(trip.title).toBeDefined()
    // v1.14：已出发时间 + 日记时间轴
    expect(trip.departedAt).toBeNull()
    expect(trip.diary).toEqual([])
  })

  it('createDiaryEntry 返回空文本条目（照片可空、节点可空）', () => {
    const e = createDiaryEntry()
    expect(typeof e.id).toBe('string')
    expect(e.text).toBe('')
    expect(e.photoIds).toEqual([])
    expect(e.nodeId).toBeNull()
    expect(typeof e.createdAt).toBe('number')
    expect(typeof e.updatedAt).toBe('number')
  })

  it('createChecklistItem 返回自动来源、未勾选的清单项', () => {
    const item: ChecklistItem = createChecklistItem('带上登山杖', 'dest-1')
    expect(typeof item.id).toBe('string')
    expect(item.text).toBe('带上登山杖')
    expect(item.checked).toBe(false)
    expect(item.source).toBe('auto')
    expect(item.prepId).toBe('dest-1')
  })
})
