import type { CommunityPost } from '../../data/community'
import type { Difficulty } from '../../data/hotRoutes'

/** 社区列表排序口径：hot=热度(likes 降序)、days=天数升序、distance=里程升序 */
export type SortKey = 'hot' | 'days' | 'distance'

/**
 * 排序：始终在副本上排序，返回新数组，不修改入参。
 * hot 按 likes 降序；days 按 days 升序；distance 按 distanceKm 升序。
 */
export function sortPosts(posts: readonly CommunityPost[], key: SortKey): CommunityPost[] {
  const sorted = [...posts]
  switch (key) {
    case 'hot':
      sorted.sort((a, b) => b.likes - a.likes)
      break
    case 'days':
      sorted.sort((a, b) => a.days - b.days)
      break
    case 'distance':
      sorted.sort((a, b) => a.distanceKm - b.distanceKm)
      break
  }
  return sorted
}

/** 难度筛选；'all' 返回全部（新数组）。不修改入参。 */
export function filterByDifficulty(
  posts: readonly CommunityPost[],
  difficulty: Difficulty | 'all',
): CommunityPost[] {
  if (difficulty === 'all') return [...posts]
  return posts.filter((p) => p.difficulty === difficulty)
}

/** 分类筛选；不修改入参。 */
export function filterByCategory(posts: readonly CommunityPost[], category: string): CommunityPost[] {
  return posts.filter((p) => p.category === category)
}

/**
 * 杂志视图分组：featured 为唯一大卡；其余按原数组顺序取前 2 为 hotPair 两列小卡，
 * 剩下为 rest 全宽卡。各分组均为新数组，不修改入参。
 */
export function getMagazineLayout(posts: readonly CommunityPost[]): {
  featured: CommunityPost | undefined
  hotPair: CommunityPost[]
  rest: CommunityPost[]
} {
  const featured = posts.find((p) => p.featured)
  const remaining = posts.filter((p) => p !== featured)
  const hotPair = remaining.slice(0, 2)
  const rest = remaining.slice(2)
  return { featured, hotPair, rest }
}
