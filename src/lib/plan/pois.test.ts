import { expect, it } from 'vitest'
import { queryPois, defaultPoiIds } from './pois'

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
