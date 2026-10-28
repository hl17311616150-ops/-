import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { addManyToAlbum, addToAlbum, clearAlbumForTest, getAlbum, getAlbumForTrip, getCompressed, removeFromAlbum } from './album'

/** 生成一张有效的小 JPEG dataURL（1x1 像素），模拟手机拍摄/相册选图 */
function makeImageDataURL(): string {
  // 1x1 透明 PNG
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
}

function makeFile(type = 'image/jpeg'): File {
  return new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], 'photo.jpg', { type })
}

describe('相册库 album', () => {
  beforeEach(async () => {
    await clearAlbumForTest()
    localStorage.clear()
  })
  afterEach(async () => {
    await clearAlbumForTest()
  })

  it('getCompressed 在解码失败时兜底返回原图，不挂起不抛错（jsdom 无真实图像解码）', async () => {
    const src = makeImageDataURL()
    const out = await getCompressed(src, 1280)
    // jsdom 无法解码图片 → 走超时兜底原样返回；真实压缩由浏览器 e2e 验证
    expect(out).toBe(src)
  })

  it('addToAlbum 存入照片，getAlbum 读回（含 tripId/takenAt）', async () => {
    const file = makeFile()
    const added = await addToAlbum(file, { tripId: 'trip_1', takenAt: 1000 })
    expect(added.id).toMatch(/^photo_/)
    expect(added.tripId).toBe('trip_1')
    expect(added.takenAt).toBe(1000)
    const all = await getAlbum()
    expect(all.length).toBe(1)
    expect(all[0].id).toBe(added.id)
  })

  it('getAlbumForTrip 只返回该行程的照片', async () => {
    await addToAlbum(makeFile(), { tripId: 'trip_1', takenAt: 1 })
    await addToAlbum(makeFile(), { tripId: 'trip_2', takenAt: 2 })
    const t1 = await getAlbumForTrip('trip_1')
    expect(t1.length).toBe(1)
    expect(t1[0].tripId).toBe('trip_1')
  })

  it('removeFromAlbum 删除单张照片', async () => {
    const a = await addToAlbum(makeFile(), { tripId: 't1', takenAt: 1 })
    const b = await addToAlbum(makeFile(), { tripId: 't1', takenAt: 2 })
    await removeFromAlbum(a.id)
    const all = await getAlbum()
    expect(all.map((p) => p.id)).toEqual([b.id])
  })

  it('localStorage 旧照片（travel:v1:photos）迁移进相册库并清除旧 key', async () => {
    localStorage.setItem('travel:v1:photos', JSON.stringify([{ id: 'photo_old', destinationId: 'visited', url: makeImageDataURL(), takenAt: 123, visibility: 'self' }]))
    // 触发迁移
    const { migrateLegacyPhotos } = await import('./album')
    await migrateLegacyPhotos()
    const all = await getAlbum()
    expect(all.length).toBe(1)
    expect(all[0].id).toBe('photo_old')
    expect(localStorage.getItem('travel:v1:photos')).toBeNull()
  })

  it('addManyToAlbum 一次多选入库并过滤非图片，全部关联同 tripId', async () => {
    const png = new File([new Uint8Array([0x89])], 'a.png', { type: 'image/png' })
    const jpg = new File([new Uint8Array([0xff])], 'b.jpg', { type: 'image/jpeg' })
    const txt = new File([new Uint8Array([0x61])], 'c.txt', { type: 'text/plain' })
    const out = await addManyToAlbum([png, jpg, txt], { tripId: 't1', takenAt: 2000 })
    // txt 被过滤，只入两张图片
    expect(out.length).toBe(2)
    expect(out.every((p) => p.tripId === 't1')).toBe(true)
    expect(out.every((p) => p.takenAt === 2000)).toBe(true)
    const all = await getAlbum()
    expect(all.length).toBe(2)
  })
})
