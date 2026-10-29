import { describe, expect, it } from 'vitest'
import { HOT_ROUTES } from './hotRoutes'

describe('HOT_ROUTES', () => {
  it('内置 6 条，字段完整', () => {
    expect(HOT_ROUTES).toHaveLength(6)
    for (const r of HOT_ROUTES) {
      expect(r.id.length).toBeGreaterThan(0)
      expect(r.name.length).toBeGreaterThan(0)
      expect(r.days).toBeGreaterThan(0)
      expect(r.distanceKm).toBeGreaterThan(0)
      expect(['轻松', '中等', '挑战']).toContain(r.difficulty)
      expect(r.image.length).toBeGreaterThan(0)
      expect(r.desc && r.desc.length).toBeGreaterThan(0)
    }
  })

  it('id 不重复，前三条为川西 / 滇西北 / 皖南', () => {
    expect(new Set(HOT_ROUTES.map((r) => r.id)).size).toBe(6)
    expect(HOT_ROUTES[0].id).toBe('chuanxi')
    expect(HOT_ROUTES[1].id).toBe('dianxibei')
    expect(HOT_ROUTES[2].id).toBe('wannan')
  })
})
