import { getAlbum, putAlbumPhoto } from '../album'
import { COMMUNITY_POSTS } from '../../data/community'
import { seedPhotoUrl } from '../../data/reviewSeed'

/** 种子照片固定基准时刻：2026-10-08 07:20（本地时区构造），再按去重后序号做单调偏移 */
const COMMUNITY_PHOTO_BASE_TS = new Date(2026, 9, 8, 7, 20).getTime()

/**
 * 汇总所有社区帖子 entries 引用的 photoIds：
 * - Set 去重，保留首次出现顺序（帖子顺序 → 条目顺序 → photoIds 顺序）；
 * - 返回 string[]，供播种与测试断言使用。
 */
export function collectCommunityPhotoIds(): string[] {
  const seen = new Set<string>()
  const ids: string[] = []
  for (const post of COMMUNITY_POSTS) {
    for (const entry of post.entries) {
      for (const photoId of entry.photoIds) {
        if (!seen.has(photoId)) {
          seen.add(photoId)
          ids.push(photoId)
        }
      }
    }
  }
  return ids
}

/**
 * 幂等播种社区帖子引用的照片到相册库（IndexedDB）：
 * - 已存在的 id 跳过，重复调用不产生重复记录；
 * - takenAt / createdAt 为确定性时间戳（基准 + 去重列表中的 1-based 序号），不依赖 Date.now()；
 * - url 复用 reviewSeed 的 6 张本地封面图循环（序号 - 1）% 6；
 * - tripId / nodeId 均为 null（离线演示数据，不绑定真实行程），visibility 为 'self'。
 */
export async function ensureCommunityPhotos(): Promise<void> {
  const existing = new Set((await getAlbum()).map((photo) => photo.id))
  const ids = collectCommunityPhotoIds()
  for (let ordinal = 1; ordinal <= ids.length; ordinal += 1) {
    const id = ids[ordinal - 1]
    if (existing.has(id)) continue
    const takenAt = COMMUNITY_PHOTO_BASE_TS + ordinal
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
