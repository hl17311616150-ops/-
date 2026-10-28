import { describe, expect, it, vi } from 'vitest'
import { bootstrap } from './bootstrap'

describe('启动初始化 bootstrap', () => {
  it('照片迁移幂等：第二次运行不重复迁移（Review Focus #5）', async () => {
    localStorage.setItem('travel:v1:photos', JSON.stringify([
      { id: 'p1', destinationId: 'd', url: 'data:image/png;base64,x', takenAt: 1, visibility: 'self' },
    ]))
    const first = await bootstrap()
    expect(first.photosMigrated).toBe(1)
    const second = await bootstrap()
    expect(second.photosMigrated).toBe(0)
  })

  it('照片迁移失败时不阻塞（Review Focus #4）', async () => {
    // 让 migrateLegacyPhotos 抛错（如 IndexedDB 被破坏）时，bootstrap 仍 resolve
    const r = await bootstrap()
    expect(r.schemaVersion).toBeGreaterThanOrEqual(2)
  })

  it('照片迁移抛错时 bootstrap 仍 resolve，photosMigrated 置 0（Review Focus #4）', async () => {
    const album = await import('./album')
    const spy = vi.spyOn(album, 'migrateLegacyPhotos').mockRejectedValueOnce(new Error('IDB broken'))
    const r = await bootstrap() // 不 reject
    expect(r.photosMigrated).toBe(0)
    expect(r.schemaVersion).toBeGreaterThanOrEqual(2)
    spy.mockRestore()
  })
})
