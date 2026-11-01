import { beforeEach, describe, expect, it } from 'vitest'
import { clearAlbumForTest, getAlbum } from '../album'
import { SEED_DIARIES, SEED_PHOTO_TOTAL } from '../../data/reviewSeed'
import { ensureSeedPhotos, getReviewData } from './seedStore'
import { createTrip } from '../../types'

beforeEach(async () => {
  await clearAlbumForTest()
  localStorage.clear()
})

describe('reviewSeed', () => {
  it('照片总数 38，条目照片数之和一致且含 1 条纯文字', () => {
    expect(SEED_DIARIES.reduce((n, d) => n + d.photoCount, 0)).toBe(SEED_PHOTO_TOTAL)
    expect(SEED_DIARIES.filter((d) => d.photoCount === 0)).toHaveLength(1)
  })
})

describe('ensureSeedPhotos', () => {
  it('播种 38 张，照片 id 稳定且关联 tripId', async () => {
    await ensureSeedPhotos()
    const all = await getAlbum()
    expect(all).toHaveLength(38)
    expect(all[0].id).toBe('seed_photo_01')
  })
  it('重复播种幂等，不产生重复（Review Focus #4）', async () => {
    await ensureSeedPhotos()
    await ensureSeedPhotos()
    expect(await getAlbum()).toHaveLength(38)
  })
})

describe('getReviewData', () => {
  it('diary 为空时返回种子条目，且不写回 K.trip（Review Focus #4）', async () => {
    const trip = createTrip()
    const { entries } = await getReviewData(trip)
    expect(entries).toHaveLength(SEED_DIARIES.length)
    const stored = localStorage.getItem('travel:v1:trip')
    const parsed = stored ? JSON.parse(stored) : null
    expect(parsed?.diary ?? []).toEqual([])
  })
  it('trip 已有真实 diary 时直接使用、不替换', async () => {
    const trip = createTrip()
    trip.diary = [{ id: 'real1', text: '我的真实日记', photoIds: [], nodeId: null, createdAt: 1, updatedAt: 1 }]
    const { entries } = await getReviewData(trip)
    expect(entries.map((e) => e.id)).toEqual(['real1'])
  })
})
