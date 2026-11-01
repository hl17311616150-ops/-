import { beforeEach, expect, it } from 'vitest'
import { getAlbum, clearAlbumForTest } from '../album'
import { COMMUNITY_POSTS } from '../../data/community'
import { ensureCommunityPhotos, collectCommunityPhotoIds } from './communitySeed'

beforeEach(async () => { await clearAlbumForTest() })

it('collectCommunityPhotoIds 去重汇总且数量与帖子引用一致', () => {
  const expected = new Set(COMMUNITY_POSTS.flatMap((p) => p.entries.flatMap((e) => e.photoIds)))
  expect(collectCommunityPhotoIds().sort()).toEqual([...expected].sort())
})
it('首次播种后相册含全部社区照片', async () => {
  await ensureCommunityPhotos()
  const ids = (await getAlbum()).map((p) => p.id)
  for (const pid of collectCommunityPhotoIds()) expect(ids).toContain(pid)
})
it('重复播种幂等，不产生重复记录', async () => {
  await ensureCommunityPhotos(); await ensureCommunityPhotos()
  expect(await getAlbum()).toHaveLength(collectCommunityPhotoIds().length)
})
it('播种照片 tripId/nodeId 为 null、visibility 为 self', async () => {
  await ensureCommunityPhotos()
  const photo = (await getAlbum()).find((p) => p.id === collectCommunityPhotoIds()[0])
  expect(photo?.tripId).toBeNull(); expect(photo?.nodeId).toBeNull(); expect(photo?.visibility).toBe('self')
})
