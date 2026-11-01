import { getAlbum, putAlbumPhoto } from '../album'
import { SEED_DIARIES, SEED_PHOTO_TOTAL, seedPhotoId, seedPhotoUrl } from '../../data/reviewSeed'
import type { DiaryEntry, Trip } from '../../types'

/** 种子照片固定基准时刻：2026-10-08 07:20（本地时区构造），再按全局序号做单调偏移 */
const SEED_PHOTO_BASE_TS = new Date(2026, 9, 8, 7, 20).getTime()

/**
 * 幂等播种 38 张种子照片到相册库（IndexedDB）：
 * - 已存在的 id 跳过，重复调用不产生重复记录；
 * - 照片只在相册存一份，日记通过 photoIds 引用，不重复存储；
 * - tripId / nodeId 均为 null（离线演示数据，不绑定真实行程）。
 */
export async function ensureSeedPhotos(): Promise<void> {
  const existing = new Set((await getAlbum()).map((photo) => photo.id))
  for (let ordinal = 1; ordinal <= SEED_PHOTO_TOTAL; ordinal += 1) {
    const id = seedPhotoId(ordinal)
    if (existing.has(id)) continue
    const takenAt = SEED_PHOTO_BASE_TS + ordinal
    await putAlbumPhoto({
      id,
      tripId: null,
      nodeId: null,
      url: seedPhotoUrl(ordinal),
      takenAt,
      createdAt: takenAt,
      visibility: 'self',
    })
  }
}

/**
 * 组装回顾页数据：
 * - trip.diary 为非空数组时原样返回，不替换、不排序；
 * - 为空时先幂等播种种子照片，再按 SEED_DIARIES 顺序构造 8 条种子日记；
 * - 全程不调用 save，localStorage 中的当前行程（travel:v1:trip）保持不变。
 *
 * 照片全局序号按条目顺序递增分配（1–38）；纯文字条目（photoCount 0）photoIds 为空。
 */
export async function getReviewData(trip: Trip): Promise<{ entries: DiaryEntry[] }> {
  if (Array.isArray(trip.diary) && trip.diary.length > 0) {
    return { entries: trip.diary }
  }

  await ensureSeedPhotos()

  let ordinal = 0
  const entries: DiaryEntry[] = SEED_DIARIES.map((spec) => {
    const photoIds: string[] = []
    for (let i = 0; i < spec.photoCount; i += 1) {
      ordinal += 1
      photoIds.push(seedPhotoId(ordinal))
    }
    const createdAt = new Date(2026, 9, spec.day, spec.hour, spec.minute).getTime()
    return {
      id: spec.id,
      text: spec.text,
      photoIds,
      nodeId: spec.poiId,
      createdAt,
      updatedAt: createdAt,
    }
  })

  return { entries }
}
