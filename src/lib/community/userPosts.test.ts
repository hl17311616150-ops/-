import { beforeEach, expect, it } from 'vitest'
import { save } from '../../storage/store'
import { K } from '../../storage/keys'
import { createTrip } from '../../types'
import type { DiaryEntry, Trip } from '../../types'
import { COMMUNITY_POSTS } from '../../data/community'
import {
  COVER_OPTIONS,
  CURRENT_USER,
  buildDraft,
  getAllPosts,
  getAnyPostById,
  loadStoredPosts,
  publishEntryToOngoing,
  savePublishedPost,
  toCommunityPost,
  tripToNodes,
  type StoredPost,
} from './userPosts'

/**
 * 用户帖数据层测试（Plan 7 · Task 2）。
 * jsdom 中 localStorage 跨用例共享，beforeEach 清空 localStorage，避免用例互相污染。
 */

beforeEach(() => {
  localStorage.clear()
})

/** 构造一条形状合法的用户帖夹具（字段形状对齐 StoredPost） */
function validStoredPost(id: string, status: StoredPost['status']): StoredPost {
  return {
    id,
    tripId: `trip_${id}`,
    title: '夹具游记',
    author: { id: 'me', name: '我', avatarChar: '我', avatarColor: 'hsl(150 42% 52%)', location: '广安' },
    cover: COVER_OPTIONS[0],
    days: 1,
    nights: 0,
    distanceKm: 0,
    difficulty: '中等',
    dateRangeText: '',
    nodes: ['成都'],
    entries: [],
    likes: 0,
    comments: 0,
    collects: 0,
    featured: false,
    category: '自驾',
    status,
    visibility: 'public',
  }
}

function makeEntry(id: string, text: string, createdAt: number): DiaryEntry {
  return { id, text, photoIds: [], nodeId: null, createdAt, updatedAt: createdAt }
}

const entryA = makeEntry('entry_a', '第一条日记', 1000)
const entryB = makeEntry('entry_b', '第二条日记', 2000)
const entries: DiaryEntry[] = [entryA, entryB]

function makeTrip(): Trip {
  const trip = createTrip()
  trip.id = 'trip_fixture'
  trip.title = ''
  trip.startPoint = '成都'
  trip.waypoints = []
  trip.destinationId = null
  trip.totalDays = 3
  return trip
}

// ---------- Step 1：持久化与形状守卫 ----------

it('loadStoredPosts 合并 ongoing/completed 两 key，坏形状被过滤', () => {
  save(K.communityOngoing, [{ bad: 1 }])
  save(K.communityCompleted, [validStoredPost('completed_x', 'completed')])
  const posts = loadStoredPosts()
  expect(posts).toHaveLength(1)
  expect(posts[0].id).toBe('completed_x')
})

it('对象/标量占位时回退空数组，不抛错', () => {
  save(K.communityOngoing, { not: 'array' })
  expect(loadStoredPosts()).toEqual([])
})

it('completed 键对象占位、ongoing 键标量占位时均回退空数组，不抛错', () => {
  save(K.communityOngoing, 'scalar')
  save(K.communityCompleted, 42)
  expect(loadStoredPosts()).toEqual([])
})

// ---------- Step 3：装配 ----------

it('getAllPosts 拼接内置种子帖与用户帖；getAnyPostById 两命名空间均可命中', () => {
  const trip = makeTrip()
  publishEntryToOngoing(trip, entryA)
  const all = getAllPosts()
  expect(all.length).toBe(COMMUNITY_POSTS.length + 1)
  expect(getAnyPostById('chuanxi')?.title).toContain('川西')
  expect(getAnyPostById(`ongoing_${trip.id}`)?.id).toBe(`ongoing_${trip.id}`)
  expect(getAnyPostById('不存在')).toBeUndefined()
})

it('toCommunityPost 去掉 tripId/visibility，保留其余字段', () => {
  const trip = makeTrip()
  publishEntryToOngoing(trip, entryA)
  const stored = loadStoredPosts()[0]
  const post = toCommunityPost(stored)
  expect('tripId' in post).toBe(false)
  expect('visibility' in post).toBe(false)
  expect(post.id).toBe(stored.id)
  expect(post.entries).toBe(stored.entries)
})

it('tripToNodes 命中 POI 取名称，未命中保留原值，空值跳过并去重', () => {
  const trip = createTrip()
  trip.startPoint = '成都'
  trip.waypoints = ['changsha-yuelushan', 'changsha-yuelushan']
  trip.destinationId = null
  expect(tripToNodes(trip)).toEqual(['成都', '岳麓山'])

  const plain = createTrip()
  plain.startPoint = ''
  plain.waypoints = ['一个陌生目的地']
  plain.destinationId = null
  expect(tripToNodes(plain)).toEqual(['一个陌生目的地'])

  expect(tripToNodes(createTrip())).toEqual([])
})

// ---------- Step 4：发布动作 ----------

it('publishEntryToOngoing 首次建 ongoing，再次追加同 id 去重', () => {
  const trip = makeTrip()
  const p1 = publishEntryToOngoing(trip, entryA)
  expect(p1.id).toBe(`ongoing_${trip.id}`)
  expect(p1.status).toBe('ongoing')
  const p2 = publishEntryToOngoing(trip, entryB)
  expect(p2.entries.map((e) => e.id)).toEqual([entryA.id, entryB.id])
  publishEntryToOngoing(trip, entryA)
  expect(loadStoredPosts()[0].entries).toHaveLength(2)
})

it('savePublishedPost 固化选中条目为 completed 并移除该 trip 的 ongoing', () => {
  const trip = makeTrip()
  publishEntryToOngoing(trip, entryA)
  const draft = { ...buildDraft(trip, entries), selectedEntryIds: [entryA.id] }
  const saved = savePublishedPost(trip, entries, draft)
  expect(saved.status).toBe('completed')
  expect(saved.id).toBe(`completed_${trip.id}`)
  expect(loadStoredPosts().map((p) => p.status)).toEqual(['completed'])
})

it('savePublishedPost 按 selectedEntryIds 过滤并保持 entries 原顺序，重复发布覆盖旧帖', () => {
  const trip = makeTrip()
  const draft = { ...buildDraft(trip, entries), selectedEntryIds: [entryB.id, entryA.id] }
  savePublishedPost(trip, entries, draft)
  const first = loadStoredPosts()
  expect(first).toHaveLength(1)
  expect(first[0].entries.map((e) => e.id)).toEqual([entryA.id, entryB.id])

  // 重复发布：同 trip 只保留一条 completed，不产生重复
  savePublishedPost(trip, entries, { ...draft, selectedEntryIds: [entryA.id] })
  const second = loadStoredPosts()
  expect(second).toHaveLength(1)
  expect(second[0].entries.map((e) => e.id)).toEqual([entryA.id])
})

it('savePublishedPost 作者为 CURRENT_USER、互动计数为 0、featured 为 false', () => {
  const trip = makeTrip()
  const draft = buildDraft(trip, entries)
  const saved = savePublishedPost(trip, entries, draft)
  expect(saved.author).toEqual(CURRENT_USER)
  expect(saved.likes).toBe(0)
  expect(saved.comments).toBe(0)
  expect(saved.collects).toBe(0)
  expect(saved.featured).toBe(false)
  expect(saved.visibility).toBe(draft.visibility)
})

it('buildDraft 标题空白兜底、默认全选、可见范围 public、封面取 COVER_OPTIONS[0]', () => {
  const d = buildDraft(createTrip(), entries)
  expect(d.title).toBe('我的山野游记')
  expect(d.selectedEntryIds).toEqual(entries.map((e) => e.id))
  expect(d.visibility).toBe('public')
  expect(d.cover).toBe(COVER_OPTIONS[0])
})

it('buildDraft 行程标题非空时保留标题，节点为空走默认路线兜底', () => {
  const trip = createTrip()
  trip.title = '川西环线'
  const d = buildDraft(trip, entries)
  expect(d.title).toBe('川西环线')
  expect(d.nodes).toEqual(['成都', '康定', '新都桥', '丹巴'])
})
