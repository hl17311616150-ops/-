import { beforeEach, describe, expect, it } from 'vitest'
import { createTrip } from '../types'
import { addUpcoming, getUpcoming, listUpcoming, markPrepDone, removeUpcoming } from './upcoming'

function sampleTrip() {
  const t = createTrip()
  t.departDate = '2026-11-03'
  t.totalDays = 3
  t.startPoint = '广安'
  t.waypoints = ['chengdu']
  t.destinationId = 'hua_yingshan'
  return t
}

beforeEach(() => {
  localStorage.clear()
})

describe('待出行 upcoming', () => {
  it('初始无待出行', () => {
    expect(listUpcoming()).toEqual([])
  })

  it('addUpcoming 存入行程快照，返回条目 id', () => {
    const id = addUpcoming(sampleTrip())
    const list = listUpcoming()
    expect(list.length).toBe(1)
    expect(list[0].id).toBe(id)
    expect(list[0].trip.destinationId).toBe('hua_yingshan')
    expect(list[0].trip.waypoints).toEqual(['chengdu'])
  })

  it('存的是深拷贝：之后修改原行程不影响快照', () => {
    const trip = sampleTrip()
    addUpcoming(trip)
    trip.destinationId = 'changed'
    trip.waypoints = []
    expect(listUpcoming()[0].trip.destinationId).toBe('hua_yingshan')
    expect(listUpcoming()[0].trip.waypoints).toEqual(['chengdu'])
  })

  it('getUpcoming 按 id 查；不存在返回 null', () => {
    const id = addUpcoming(sampleTrip())
    expect(getUpcoming(id)?.id).toBe(id)
    expect(getUpcoming('nope')).toBeNull()
  })

  it('removeUpcoming 移除指定条目', () => {
    const id = addUpcoming(sampleTrip())
    removeUpcoming(id)
    expect(listUpcoming()).toEqual([])
  })

  it('markPrepDone 更新准备完成状态', () => {
    const id = addUpcoming(sampleTrip())
    expect(listUpcoming()[0].prepDone).toBe(false)
    markPrepDone(id, true)
    expect(listUpcoming()[0].prepDone).toBe(true)
  })

  it('坏数据（非数组/坏条目）回退空数组', () => {
    localStorage.setItem('travel:v1:upcoming', '{"a":1}')
    expect(listUpcoming()).toEqual([])
    localStorage.setItem('travel:v1:upcoming', JSON.stringify([{ id: 'x', trip: 'bad' }]))
    expect(listUpcoming()).toEqual([])
  })
})
