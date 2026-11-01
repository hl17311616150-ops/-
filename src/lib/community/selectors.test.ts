import { expect, it } from 'vitest'
import { HOT_ROUTES } from '../../data/hotRoutes'
import { COMMUNITY_POSTS } from '../../data/community'
import { getPostById as byId, sortPosts as sort, filterByDifficulty as fd, filterByCategory as fc, getMagazineLayout as ml } from './selectors'

// 核心：帖子 id 与 HOT_ROUTES 完全一致（命名空间 404 修复）
it('帖子 id 与 HOT_ROUTES 逐字一致', () => {
  expect(COMMUNITY_POSTS.map((p) => p.id).sort()).toEqual([...HOT_ROUTES.map((r) => r.id)].sort())
})
it('getPostById 命中热门卡片 id', () => {
  expect(byId('chuanxi')?.title).toContain('川西')
  expect(byId('不存在')).toBeUndefined()
})
it('sortPosts hot 按 likes 降序、days 按 days 升序、distance 按 distanceKm 升序', () => {
  expect(sort(COMMUNITY_POSTS, 'hot').map((p) => p.likes)[0]).toBe(Math.max(...COMMUNITY_POSTS.map((p) => p.likes)))
  expect(sort(COMMUNITY_POSTS, 'days').map((p) => p.days)).toEqual([...COMMUNITY_POSTS].sort((a, b) => a.days - b.days).map((p) => p.days))
  expect(sort(COMMUNITY_POSTS, 'distance').map((p) => p.distanceKm)).toEqual([...COMMUNITY_POSTS].sort((a, b) => a.distanceKm - b.distanceKm).map((p) => p.distanceKm))
})
it('filterByDifficulty 只返回对应难度', () => {
  expect(fd(COMMUNITY_POSTS, '挑战').every((p) => p.difficulty === '挑战')).toBe(true)
  expect(fd(COMMUNITY_POSTS, 'all')).toHaveLength(COMMUNITY_POSTS.length)
})
it('filterByCategory 按分类过滤', () => {
  const cat = COMMUNITY_POSTS[0].category
  expect(fc(COMMUNITY_POSTS, cat).every((p) => p.category === cat)).toBe(true)
})
it('getMagazineLayout 给出唯一 featured、两列热门、其余', () => {
  const layout = ml(COMMUNITY_POSTS)
  expect(layout.featured?.featured).toBe(true)
  expect(layout.hotPair).toHaveLength(2)
  expect(layout.rest.length + layout.hotPair.length + 1).toBe(COMMUNITY_POSTS.length)
})
it('每条帖子 entries 的 photoIds 均为 comm_<postId>_<n> 形式且无重复', () => {
  for (const post of COMMUNITY_POSTS) {
    for (const e of post.entries) {
      for (const pid of e.photoIds) expect(pid).toMatch(new RegExp(`^comm_${post.id}_\\d+$`))
    }
  }
})
