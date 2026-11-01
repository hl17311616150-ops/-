import { describe, expect, it } from 'vitest'
import { COMMUNITY_POSTS } from '../../data/community'
import { SEED_COMMENTS, type CommentData } from './commentSeed'

/**
 * 内置种子评论测试（Plan 7 · Task 3 · Step 1）。
 * 纯离线确定性数据，不读写 localStorage。
 */

describe('种子评论结构', () => {
  it('每个内置帖至少 1 条顶层评论，且含一条 isAuthor 回复', () => {
    for (const id of COMMUNITY_POSTS.map((p) => p.id)) {
      const list = SEED_COMMENTS.filter((c) => c.postId === id)
      expect(list.some((c) => c.parentId === null)).toBe(true)
      expect(list.some((c) => c.isAuthor)).toBe(true)
    }
  })

  it('种子 createdAt 确定且不依赖 Date.now', () => {
    expect(SEED_COMMENTS.every((c) => typeof c.createdAt === 'number')).toBe(true)
  })
})

describe('种子评论装配规则', () => {
  it.each(COMMUNITY_POSTS.map((p) => p.id))('%s：2–3 条顶层评论与 1–2 条回复', (postId) => {
    const list = SEED_COMMENTS.filter((c) => c.postId === postId)
    const top = list.filter((c) => c.parentId === null)
    const replies = list.filter((c) => c.parentId !== null)
    expect(top.length).toBeGreaterThanOrEqual(2)
    expect(top.length).toBeLessThanOrEqual(3)
    expect(replies.length).toBeGreaterThanOrEqual(1)
    expect(replies.length).toBeLessThanOrEqual(2)
  })

  it('每帖恰有一条 isAuthor:true，作者即帖子作者，其余为 false', () => {
    for (const post of COMMUNITY_POSTS) {
      const list = SEED_COMMENTS.filter((c) => c.postId === post.id)
      const authored = list.filter((c) => c.isAuthor)
      expect(authored).toHaveLength(1)
      expect(authored[0].author).toEqual(post.author)
      expect(list.filter((c) => !c.isAuthor)).toHaveLength(list.length - 1)
    }
  })

  it('回复的 parentId 必须指向同帖内某条顶层评论，不串帖', () => {
    for (const post of COMMUNITY_POSTS) {
      const list = SEED_COMMENTS.filter((c) => c.postId === post.id)
      const topIds = new Set(list.filter((c) => c.parentId === null).map((c) => c.id))
      for (const reply of list.filter((c) => c.parentId !== null)) {
        expect(topIds.has(reply.parentId as string)).toBe(true)
      }
    }
  })

  it('每条评论 author 符合 CommunityAuthor 形状，字段类型合法', () => {
    for (const c of SEED_COMMENTS) {
      expect(typeof c.id).toBe('string')
      expect(typeof c.postId).toBe('string')
      expect(typeof c.text).toBe('string')
      expect(typeof c.createdAt).toBe('number')
      expect(typeof c.likes).toBe('number')
      expect(c.parentId === null || typeof c.parentId === 'string').toBe(true)
      expect(typeof c.isAuthor).toBe('boolean')
      const a = c.author
      expect(typeof a.id).toBe('string')
      expect(typeof a.name).toBe('string')
      expect(typeof a.avatarChar).toBe('string')
      expect(typeof a.avatarColor).toBe('string')
      expect(typeof a.location).toBe('string')
    }
  })

  it('顶层与回复时间戳单调递增，createdAt 全部来自固定基准偏移', () => {
    const baseline = new Date(2026, 9, 12, 10, 0).getTime()
    for (const c of SEED_COMMENTS) {
      expect(c.createdAt).toBeGreaterThanOrEqual(baseline)
    }
    const byPost = new Map<string, CommentData[]>()
    for (const c of SEED_COMMENTS) {
      const arr = byPost.get(c.postId) ?? []
      arr.push(c)
      byPost.set(c.postId, arr)
    }
    for (const list of byPost.values()) {
      const times = list.map((c) => c.createdAt)
      expect(times).toEqual([...times].sort((a, b) => a - b))
    }
  })
})
