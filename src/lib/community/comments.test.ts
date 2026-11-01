import { beforeEach, expect, it } from 'vitest'
import { save } from '../../storage/store'
import { K } from '../../storage/keys'
import { SEED_COMMENTS, type CommentData } from './commentSeed'
import { CURRENT_USER } from './userPosts'
import {
  addUserComment,
  buildCommentTree,
  getCommentsForPost,
  isUserComment,
  loadUserComments,
} from './comments'

/**
 * 评论合并 / 排序 / 树装配 / 用户新增测试（Plan 7 · Task 3 · Step 4）。
 * jsdom 中 localStorage 跨用例共享，beforeEach 清空，避免评论互相污染。
 */

beforeEach(() => {
  localStorage.clear()
})

/** 构造一条形状合法的用户评论夹具；可按字段覆盖 */
function validComment(overrides: Partial<CommentData> = {}): CommentData {
  return {
    id: 'usercm_fixture',
    postId: 'chuanxi',
    author: CURRENT_USER,
    text: '夹具评论',
    createdAt: 1_700_000_000_000,
    likes: 0,
    parentId: null,
    isAuthor: false,
    ...overrides,
  }
}

// ---------- Step 4：排序与树装配 ----------

it('buildCommentTree hot 顶层按 likes 降序、latest 按 createdAt 降序', () => {
  const hot = buildCommentTree('chuanxi', 'hot').top
  expect(hot.map((c) => c.likes)).toEqual([...hot].map((c) => c.likes).sort((a, b) => b - a))
  const latest = buildCommentTree('chuanxi', 'latest').top
  expect(latest.map((c) => c.createdAt)).toEqual([...latest].map((c) => c.createdAt).sort((a, b) => b - a))
})

it('回复按 createdAt 正序挂在父下，不串帖', () => {
  const { top, repliesByParent } = buildCommentTree('chuanxi', 'hot')
  const parent = top[0].id
  const replies = repliesByParent.get(parent) ?? []
  expect(replies.map((r) => r.createdAt)).toEqual([...replies].map((r) => r.createdAt).sort((a, b) => a - b))
})

it('addUserComment 持久化且 author=CURRENT_USER；空白返回不写入', () => {
  const c = addUserComment('chuanxi', '  想去！ ', null)
  expect(c).not.toBeNull()
  expect(c?.text).toBe('想去！')
  expect(c?.author.id).toBe('me')
  const before = loadUserComments().length
  addUserComment('chuanxi', '   ', null)
  expect(loadUserComments()).toHaveLength(before)
})

// ---------- 补充：getCommentsForPost 合并与过滤 ----------

it('getCommentsForPost 拼接种子评论与用户评论，并按 postId 过滤不串帖', () => {
  const seedChuanxi = SEED_COMMENTS.filter((c) => c.postId === 'chuanxi')
  const seedDianxibei = SEED_COMMENTS.filter((c) => c.postId === 'dianxibei')

  addUserComment('chuanxi', '用户评论 A', null)
  addUserComment('dianxibei', '用户评论 B', null)

  const chuanxi = getCommentsForPost('chuanxi')
  expect(chuanxi).toHaveLength(seedChuanxi.length + 1)
  expect(chuanxi.every((c) => c.postId === 'chuanxi')).toBe(true)

  const dianxibei = getCommentsForPost('dianxibei')
  expect(dianxibei).toHaveLength(seedDianxibei.length + 1)
  expect(dianxibei.every((c) => c.postId === 'dianxibei')).toBe(true)

  expect(getCommentsForPost('不存在的帖子')).toEqual([])
})

// ---------- 补充：坏形状 / 对象标量回退不抛错 ----------

it('loadUserComments 在对象 / 标量占位时回退空数组，不抛错', () => {
  save(K.communityComments, { not: 'array' })
  expect(loadUserComments()).toEqual([])
  save(K.communityComments, 'scalar')
  expect(loadUserComments()).toEqual([])
  save(K.communityComments, 42)
  expect(loadUserComments()).toEqual([])
})

it('混入坏条目时逐项过滤，只保留形状合法评论', () => {
  save(K.communityComments, [
    validComment({ id: 'good_a' }),
    { bad: true },
    'scalar',
    validComment({ id: 'good_b', postId: 'hainan' }),
    null,
  ])
  const list = loadUserComments()
  expect(list.map((c) => c.id)).toEqual(['good_a', 'good_b'])
})

it('isUserComment 守卫拒绝字段类型错误 / author 非对象 / parentId 非法的条目', () => {
  expect(isUserComment(validComment())).toBe(true)

  expect(isUserComment(null)).toBe(false)
  expect(isUserComment('string')).toBe(false)
  expect(isUserComment(42)).toBe(false)
  expect(isUserComment([])).toBe(false)

  expect(isUserComment(validComment({ id: 123 as unknown as string }))).toBe(false)
  expect(isUserComment(validComment({ postId: undefined as unknown as string }))).toBe(false)
  expect(isUserComment(validComment({ text: 5 as unknown as string }))).toBe(false)
  expect(isUserComment(validComment({ createdAt: 'x' as unknown as number }))).toBe(false)
  expect(isUserComment(validComment({ likes: 'y' as unknown as number }))).toBe(false)
  expect(isUserComment(validComment({ author: 'me' as unknown as CommentData['author'] }))).toBe(false)
  expect(isUserComment(validComment({ parentId: 1 as unknown as string | null }))).toBe(false)
  expect(isUserComment(validComment({ isAuthor: 'yes' as unknown as boolean }))).toBe(false)
})

// ---------- 补充：树装配隔离与回复挂载 ----------

it('buildCommentTree 回复分组只含本帖评论，父评论排序变化不影响挂载', () => {
  const chuanxi = buildCommentTree('chuanxi', 'hot')
  const dianxibei = buildCommentTree('dianxibei', 'hot')
  const chuanxiTopIds = new Set(chuanxi.top.map((c) => c.id))

  for (const [parentId, replies] of chuanxi.repliesByParent) {
    expect(chuanxiTopIds.has(parentId)).toBe(true)
    expect(replies.every((r) => r.postId === 'chuanxi')).toBe(true)
  }
  for (const replies of dianxibei.repliesByParent.values()) {
    expect(replies.every((r) => r.postId === 'dianxibei')).toBe(true)
  }

  // 两种排序下父评论集合一致，回复挂载关系不随排序漂移
  const chuanxiLatest = buildCommentTree('chuanxi', 'latest')
  expect(new Set(chuanxiLatest.top.map((c) => c.id))).toEqual(chuanxiTopIds)
  expect([...chuanxiLatest.repliesByParent.keys()].sort()).toEqual([...chuanxi.repliesByParent.keys()].sort())
})

it('用户回复挂到指定父评论下，与既有回复按时间正序排列', () => {
  const { top } = buildCommentTree('chuanxi', 'hot')
  const parentId = top[0].id
  const reply = addUserComment('chuanxi', '回复楼主', parentId)
  expect(reply).not.toBeNull()
  expect(reply?.parentId).toBe(parentId)

  const tree = buildCommentTree('chuanxi', 'hot')
  const replies = tree.repliesByParent.get(parentId) ?? []
  expect(replies.map((r) => r.createdAt)).toEqual([...replies].map((r) => r.createdAt).sort((a, b) => a - b))
  expect(replies.some((r) => r.id === reply?.id)).toBe(true)
})

// ---------- 补充：新增评论字段与写入顺序 ----------

it('addUserComment 新评论 author=CURRENT_USER、likes=0、isAuthor=false、id 前缀 usercm_', () => {
  const c = addUserComment('qinggan', '新评论', null)
  expect(c).not.toBeNull()
  expect(c?.author).toEqual(CURRENT_USER)
  expect(c?.likes).toBe(0)
  expect(c?.isAuthor).toBe(false)
  expect(c?.id.startsWith('usercm_')).toBe(true)
  expect(c?.postId).toBe('qinggan')
  expect(typeof c?.createdAt).toBe('number')
})

it('多条用户评论 unshift 进既有数组，最新一条排在最前', () => {
  const first = addUserComment('chuanxi', '第一条', null)
  const second = addUserComment('chuanxi', '第二条', null)
  expect(first).not.toBeNull()
  expect(second).not.toBeNull()
  const list = loadUserComments()
  expect(list.map((c) => c.id)).toEqual([second?.id, first?.id])
})

it('空白 / 纯空格 / 纯制表换行评论返回 null，不写入存储', () => {
  expect(addUserComment('chuanxi', '', null)).toBeNull()
  expect(addUserComment('chuanxi', '   ', null)).toBeNull()
  expect(addUserComment('chuanxi', '\t\n ', null)).toBeNull()
  expect(loadUserComments()).toHaveLength(0)
})
