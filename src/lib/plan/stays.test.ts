import { expect, it } from 'vitest'
import { queryStays, defaultStay } from './stays'

it('返回该点住宿（≥2）', () => {
  const r = queryStays('黟县')
  expect(r.length).toBeGreaterThanOrEqual(2)
  expect(r.every((s) => s.point === '黟县')).toBe(true)
})

it('默认住宿为该点第一个', () => {
  expect(defaultStay('长沙')?.name).toBe('五一广场和颐酒店')
})

it('无住宿点返回 undefined（容错）', () => {
  expect(defaultStay('不存在的点')).toBeUndefined()
})
