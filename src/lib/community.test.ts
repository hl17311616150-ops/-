import { beforeEach, describe, expect, it } from 'vitest'
import {
  addComment,
  commentCount,
  getCommunityPosts,
  getCommentsForPost,
  getInteractionState,
  togglePostLike,
  togglePostSave,
} from './community'
import { finalizeOngoing, getOngoingByTrip, getUserPosts, publishDiaryEntry } from './community'
import type { Trip } from '../types'

beforeEach(() => {
  localStorage.clear()
})

describe('社区模拟数据层 community', () => {
  it('内置示例帖 ≥8 条且字段齐全（type=completed / 结构化节点）', () => {
    const posts = getCommunityPosts()
    expect(posts.length).toBeGreaterThanOrEqual(8)
    for (const p of posts) {
      expect(p.id).toBeTruthy()
      expect(p.type).toBe('completed')
      expect(p.tripId).toBeNull()
      expect(p.author.name).toBeTruthy()
      expect(p.nodes.length).toBeGreaterThanOrEqual(2)
      expect(p.nodes[0].type).toBe('start')
      expect(p.nodes[p.nodes.length - 1].type).toBe('destination')
      expect(p.routeTitle).toContain('→')
      expect(p.location).toBeTruthy()
      expect(p.days).toBeGreaterThan(0)
      expect(p.likes).toBeGreaterThanOrEqual(0)
      expect(p.comments).toBeGreaterThanOrEqual(0)
      expect(p.saves).toBeGreaterThanOrEqual(0)
      expect(p.createdAt).toBeGreaterThan(0)
    }
  })

  it('togglePostLike 切换并同步到 getInteractionState', () => {
    const first = togglePostLike('post_huaying')
    expect(first).toBe(true)
    expect(getInteractionState().post_huaying.liked).toBe(true)
    expect(togglePostLike('post_huaying')).toBe(false)
    expect(getInteractionState().post_huaying.liked).toBe(false)
  })

  it('togglePostSave 同理', () => {
    expect(togglePostSave('post_jiuzhaigou')).toBe(true)
    expect(getInteractionState().post_jiuzhaigou.saved).toBe(true)
    expect(togglePostSave('post_jiuzhaigou')).toBe(false)
  })

  it('未知 id 返回 false 且不崩', () => {
    expect(togglePostLike('no_such_post')).toBe(false)
    expect(togglePostSave('no_such_post')).toBe(false)
    expect(Object.keys(getInteractionState())).toHaveLength(0)
  })
})

describe('社区评论 community comments', () => {
  it('getCommentsForPost：seed 评论字段齐全且 ≥1 条', () => {
    const comments = getCommentsForPost('post_huaying')
    expect(comments.length).toBeGreaterThanOrEqual(1)
    for (const c of comments) {
      expect(c.id).toBeTruthy()
      expect(c.postId).toBe('post_huaying')
      expect(c.author.name).toBeTruthy()
      expect(c.text).toBeTruthy()
      expect(c.createdAt).toBeGreaterThan(0)
    }
  })

  it('addComment：追加评论并计入 commentCount，作者为"我"', () => {
    const before = commentCount('post_huaying')
    expect(addComment('post_huaying', '  下个周末也去！  ')).toBe(true)
    expect(commentCount('post_huaying')).toBe(before + 1)
    const list = getCommentsForPost('post_huaying')
    expect(list[0].text).toBe('下个周末也去！')
    expect(list[0].author.name).toBe('我')
  })

  it('addComment 未知 postId 返回 false 且不写入', () => {
    expect(addComment('no_such_post', 'hi')).toBe(false)
    expect(commentCount('no_such_post')).toBe(0)
  })

  it('addComment 纯空白/空文本返回 false 不添加', () => {
    const before = commentCount('post_chengdu')
    expect(addComment('post_chengdu', '   ')).toBe(false)
    expect(addComment('post_chengdu', '')).toBe(false)
    expect(commentCount('post_chengdu')).toBe(before)
  })

  it('新增评论持久化：重新读取后仍在（localStorage 落盘）', () => {
    addComment('post_jiuzhaigou', '照片拍得真好看')
    const again = getCommentsForPost('post_jiuzhaigou')
    expect(again[0].text).toBe('照片拍得真好看')
    expect(again[0].postId).toBe('post_jiuzhaigou')
  })
})

describe('社区边走边发 ongoing', () => {
  function mockTrip(id = 't_live1'): Trip {
    return {
      id,
      title: '广安 → 广安·华蓥山',
      intentTags: [],
      departDate: '2026-11-03',
      totalDays: 2,
      startPoint: '广安',
      waypoints: [],
      destinationId: 'dest_huaying',
      departed: true,
      departedAt: 1710000000000,
      diary: [
        { id: 'e1', text: '云海太美了', photoIds: ['p1'], nodeId: null, createdAt: 1, updatedAt: 1 },
        { id: 'e2', text: '天池边发呆', photoIds: [], nodeId: null, createdAt: 2, updatedAt: 2 },
      ],
      createdAt: 1,
      updatedAt: 1,
      visibility: 'self',
    }
  }

  it('publishDiaryEntry 首次创建 ongoing（绑定 tripId + publishedEntryIds + 结构化节点）', () => {
    const trip = mockTrip()
    expect(publishDiaryEntry('t_live1', 'e1', trip)).toBe(true)
    const ongoing = getOngoingByTrip('t_live1')
    expect(ongoing).not.toBeNull()
    expect(ongoing?.type).toBe('ongoing')
    expect(ongoing?.tripId).toBe('t_live1')
    expect(ongoing?.publishedEntryIds).toContain('e1')
    expect(ongoing?.nodes[0]).toEqual({ key: 'start', type: 'start', label: '广安' })
    expect(ongoing?.nodes[ongoing.nodes.length - 1]).toEqual({ key: 'dest_dest_huaying', type: 'destination', label: '广安·华蓥山' })
    expect(ongoing?.routeTitle).toContain('→')
  })

  it('重复发布同 trip 追加不重复创建', () => {
    const trip = mockTrip()
    publishDiaryEntry('t_live1', 'e1', trip)
    publishDiaryEntry('t_live1', 'e2', trip)
    const ongoing = getOngoingByTrip('t_live1')
    expect(ongoing?.publishedEntryIds).toEqual(['e1', 'e2'])
    expect(getUserPosts().length).toBe(1)
  })

  it('未知 tripId / 不存在日记条目 / 未出发 → 拒绝', () => {
    const trip = mockTrip()
    expect(publishDiaryEntry('t_ghost', 'e1', trip)).toBe(false)
    expect(publishDiaryEntry('t_live1', 'nope', trip)).toBe(false)
    expect(publishDiaryEntry('t_live1', 'e1', { ...trip, departed: false })).toBe(false)
    expect(getUserPosts().length).toBe(0)
  })

  it('finalizeOngoing 固化 entries 转 completed、移除 ongoing', () => {
    const trip = mockTrip()
    publishDiaryEntry('t_live1', 'e1', trip)
    publishDiaryEntry('t_live1', 'e2', trip)
    expect(finalizeOngoing('t_live1', trip)).toBe(true)
    expect(getOngoingByTrip('t_live1')).toBeNull()
    const posts = getUserPosts()
    expect(posts.length).toBe(1)
    expect(posts[0].type).toBe('completed')
    const cp = posts[0]
    if (cp.type === 'completed') {
      expect(cp.entries.length).toBe(2)
      expect(cp.entries.map((x) => x.text)).toEqual(['云海太美了', '天池边发呆'])
      expect(cp.entries[0].photoIds).toEqual(['p1'])
    }
  })

  it('getCommunityPosts 合并 SEED + 用户帖（ongoing 聚合最新）', () => {
    const trip = mockTrip()
    publishDiaryEntry('t_live1', 'e2', trip)
    const all = getCommunityPosts()
    expect(all.some((p) => p.id.startsWith('ongoing_'))).toBe(true)
    const og = all.find((p) => p.type === 'ongoing')
    expect(og).toBeTruthy()
  })

  it('用户帖可互动、未知 id 仍拒绝', () => {
    const trip = mockTrip()
    publishDiaryEntry('t_live1', 'e1', trip)
    const id = getOngoingByTrip('t_live1')!.id
    expect(togglePostLike(id)).toBe(true)
    expect(togglePostSave(id)).toBe(true)
    expect(addComment(id, '求更新')).toBe(true)
    expect(togglePostLike('no_such')).toBe(false)
    expect(togglePostSave('no_such')).toBe(false)
  })
})
