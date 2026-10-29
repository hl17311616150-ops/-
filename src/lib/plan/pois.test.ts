import { expect, it } from 'vitest'
import { queryPois, defaultPoiIds, pruneSelectedPois } from './pois'

it('返回该点 POI 与分页', () => {
  const r = queryPois('长沙', { page: 0, pageSize: 6 })
  expect(r.total).toBeGreaterThanOrEqual(12)
  expect(r.items).toHaveLength(6)
  expect(r.items.every((p) => p.point === '长沙')).toBe(true)
})

it('搜索+分类+排序同时生效（Review Focus #4）', () => {
  const r = queryPois('长沙', { search: '博物馆', category: 'museum', sort: 'rating', page: 0, pageSize: 12 })
  expect(r.items.length).toBeGreaterThan(0)
  expect(r.items.every((p) => p.category === 'museum' && p.name.includes('博物馆'))).toBe(true)
  const ratings = r.items.map((p) => p.rating)
  expect([...ratings]).toEqual([...ratings].sort((a, b) => b - a))
})

it('排序：distance 升序、rating 降序', () => {
  const d = queryPois('长沙', { sort: 'distance', page: 0, pageSize: 12 }).items.map((p) => p.distanceKm)
  expect([...d]).toEqual([...d].sort((a, b) => a - b))
})

it('默认经典项', () => {
  expect(defaultPoiIds('长沙').length).toBeGreaterThan(0)
})

it('pruneSelectedPois：剔除不在新 points 内的离场点已选记录，保留有效项', () => {
  const selected = { 长沙: ['poi-cs-1'], 景德镇: ['poi-jdz-2'], 自贡: ['poi-zg-9'] }
  expect(pruneSelectedPois(['长沙', '呈坎'], selected)).toEqual({ 长沙: ['poi-cs-1'] })
})

it('pruneSelectedPois：points 空 / selected 缺省或空对象时安全返回 {}', () => {
  expect(pruneSelectedPois([], { 长沙: ['poi-cs-1'] })).toEqual({})
  expect(pruneSelectedPois(['长沙'], undefined)).toEqual({})
  expect(pruneSelectedPois(['长沙'], null)).toEqual({})
  expect(pruneSelectedPois(['长沙'], {})).toEqual({})
})
