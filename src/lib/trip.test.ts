import { describe, expect, it } from 'vitest'
import {
  addTripDiary,
  addWaypoint,
  canDepart,
  clearActive,
  getTrip,
  removeTripDiary,
  removeWaypoint,
  replaceActive,
  routeNodes,
  setDepartDate,
  setDestination,
  setIntent,
  setStartPoint,
  setTotalDays,
  updateTripDiary,
} from './trip'
import { createDiaryEntry } from '../types'

describe('trip 总路线模型', () => {
  it('getTrip 初始：无日期/出发点/目的地，总天数 1，空途经点', () => {
    const t = getTrip()
    expect(t.departDate).toBeNull()
    expect(t.totalDays).toBe(1)
    expect(t.startPoint).toBe('')
    expect(t.waypoints).toEqual([])
    expect(t.destinationId).toBeNull()
    expect(t.intentTags).toEqual([])
  })

  it('setDepartDate / setTotalDays / setStartPoint 持久化', () => {
    setDepartDate('2026-11-03')
    setTotalDays(4)
    setStartPoint('广安')
    const t = getTrip()
    expect(t.departDate).toBe('2026-11-03')
    expect(t.totalDays).toBe(4)
    expect(t.startPoint).toBe('广安')
  })

  it('setDestination / addWaypoint / removeWaypoint', () => {
    setDestination('hua_yingshan')
    addWaypoint('chongqing')
    addWaypoint('chengdu')
    const t = getTrip()
    expect(t.destinationId).toBe('hua_yingshan')
    expect(t.waypoints).toEqual(['chongqing', 'chengdu'])
    removeWaypoint('chongqing')
    expect(getTrip().waypoints).toEqual(['chengdu'])
  })

  it('addWaypoint 去重：不重复加入同一途经点', () => {
    clearActive()
    setDestination('a')
    addWaypoint('x')
    addWaypoint('x')
    expect(getTrip().waypoints).toEqual(['x'])
  })

  it('setIntent 写入意图标签', () => {
    setIntent('登山徒步')
    expect(getTrip().intentTags).toEqual(['登山徒步'])
  })

  it('canDepart：需出发日期+天数+出发点+目的地', () => {
    clearActive()
    expect(canDepart(getTrip())).toBe(false) // 缺日期/出发点/目的地
    setDepartDate('2026-11-03')
    setStartPoint('广安')
    setDestination('hua_yingshan')
    expect(canDepart(getTrip())).toBe(true)
    setDestination(null as never)
    expect(canDepart(getTrip())).toBe(false) // 缺目的地
  })

  it('clearActive 重置为空行程', () => {
    setDepartDate('2026-11-03')
    setStartPoint('广安')
    setDestination('hua_yingshan')
    addWaypoint('chengdu')
    clearActive()
    const t = getTrip()
    expect(t.departDate).toBeNull()
    expect(t.destinationId).toBeNull()
    expect(t.waypoints).toEqual([])
    // 清空后新行程带默认出发点（模拟定位），出发按钮不因此消失
    expect(t.startPoint).toBe('广安')
  })

  it('replaceActive 用给定行程替换当前', () => {
    const snapshot = getTrip()
    snapshot.destinationId = 'chengdu'
    snapshot.waypoints = ['chongqing']
    replaceActive(snapshot)
    expect(getTrip().destinationId).toBe('chengdu')
    expect(getTrip().waypoints).toEqual(['chongqing'])
  })

  it('routeNodes 返回 出发点→途经点→目的地 节点链', () => {
    clearActive()
    setStartPoint('广安')
    setDestination('hua_yingshan')
    addWaypoint('chengdu')
    const nodes = routeNodes(getTrip())
    expect(nodes.map((n) => n.type)).toEqual(['start', 'waypoint', 'destination'])
    expect(nodes[0]).toMatchObject({ type: 'start', label: '广安' })
    expect(nodes[1]).toMatchObject({ type: 'waypoint', destinationId: 'chengdu' })
    expect(nodes[2]).toMatchObject({ type: 'destination', destinationId: 'hua_yingshan' })
  })

  it('addTripDiary 记录进行中日记，update/remove 编辑删除', () => {
    clearActive()
    const e = createDiaryEntry()
    e.text = '出发！'
    addTripDiary(e)
    expect(getTrip().diary).toHaveLength(1)
    expect(getTrip().diary[0].text).toBe('出发！')
    updateTripDiary(e.id, { text: '到华蓥山了' })
    expect(getTrip().diary[0].text).toBe('到华蓥山了')
    removeTripDiary(e.id)
    expect(getTrip().diary).toHaveLength(0)
  })
})
