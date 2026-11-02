/**
 * 评论数据层（Plan 7 · Task 3 · Step 5）：
 * - 内置种子评论与 localStorage 用户评论的合并、形状守卫、排序与树装配；
 * - 容错口径与 store.ts 一致：损坏 / 形状错误 / 标量占位的数据一律过滤或回退，不抛错；
 * - 纯本地 localStorage，不联网、不接后端。
 */

import { save, loadArray } from '../../storage/store'
import { K } from '../../storage/keys'
import { SEED_COMMENTS, type CommentData } from './commentSeed'
import { CURRENT_USER } from './userPosts'

/** 评论排序口径：hot=热度（likes 降序）、latest=最新（createdAt 降序） */
export type CommentSort = 'hot' | 'latest'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * 用户评论形状守卫：
 * - id / postId / text 为 string；createdAt / likes 为 number；
 * - author 为普通对象且 id 为 string；parentId 为 string 或 null；isAuthor 为 boolean。
 * 坏条目由 loadArray 逐项过滤，不抛错。
 */
export function isUserComment(item: unknown): item is CommentData {
  if (!isPlainObject(item)) return false
  if (typeof item.id !== 'string' || item.id === '') return false
  if (typeof item.postId !== 'string' || item.postId === '') return false
  if (typeof item.text !== 'string') return false
  if (typeof item.createdAt !== 'number' || Number.isNaN(item.createdAt)) return false
  if (typeof item.likes !== 'number' || Number.isNaN(item.likes)) return false
  if (!isPlainObject(item.author) || typeof item.author.id !== 'string') return false
  if (item.parentId !== null && typeof item.parentId !== 'string') return false
  if (typeof item.isAuthor !== 'boolean') return false
  return true
}

/** 读取持久化用户评论（坏形状 / 标量占位回退空数组） */
export function loadUserComments(): CommentData[] {
  return loadArray<CommentData>(K.communityComments, isUserComment)
}

/** 内置种子评论 + 用户评论，按 postId 过滤；不串帖、不修改入参 */
export function getCommentsForPost(postId: string): CommentData[] {
  return [...SEED_COMMENTS, ...loadUserComments()].filter((c) => c.postId === postId)
}

/**
 * 树装配：
 * - 顶层（parentId=null）按 sort 排序：hot=likes 降序，latest=createdAt 降序；
 * - 回复按 parentId 分组进 repliesByParent，组内 createdAt 升序；
 * - 父评论排序变化不影响回复挂载；分组只含本帖评论，不串帖；排序始终在副本上进行。
 */
export function buildCommentTree(
  postId: string,
  sort: CommentSort,
): { top: CommentData[]; repliesByParent: Map<string, CommentData[]> } {
  const all = getCommentsForPost(postId)
  const top = all.filter((c) => c.parentId === null)
  const replies = all.filter((c) => c.parentId !== null)

  const sortedTop = [...top]
  if (sort === 'hot') {
    sortedTop.sort((a, b) => b.likes - a.likes)
  } else {
    sortedTop.sort((a, b) => b.createdAt - a.createdAt)
  }

  const repliesByParent = new Map<string, CommentData[]>()
  for (const reply of replies) {
    const parentId = reply.parentId as string
    const bucket = repliesByParent.get(parentId)
    if (bucket) {
      bucket.push(reply)
    } else {
      repliesByParent.set(parentId, [reply])
    }
  }
  for (const bucket of repliesByParent.values()) {
    bucket.sort((a, b) => a.createdAt - b.createdAt)
  }

  return { top: sortedTop, repliesByParent }
}

/** 用户评论 id 序号：模块级递增，避免同一毫秒内 id 撞号 */
let userCommentSeq = 0

/**
 * 新增用户评论：
 * - text 先 trim，空白（空串 / 纯空格 / 纯制表换行）返回 null，不写入存储；
 * - 新评论 author=CURRENT_USER、likes=0、isAuthor=false；
 * - id = `usercm_<Date.now()>_<seq>`；unshift 进既有用户评论数组后持久化，返回落库评论；
 * - 写存储失败（save 返回 false）返回 null，不返回评论对象，由调用方停留并提示。
 */
export function addUserComment(
  postId: string,
  text: string,
  parentId: string | null,
): CommentData | null {
  const trimmed = text.trim()
  if (trimmed === '') return null

  userCommentSeq += 1
  const comment: CommentData = {
    id: `usercm_${Date.now()}_${userCommentSeq}`,
    postId,
    author: CURRENT_USER,
    text: trimmed,
    createdAt: Date.now(),
    likes: 0,
    parentId,
    isAuthor: false,
  }

  const existing = loadUserComments()
  const ok = save(K.communityComments, [comment, ...existing])
  return ok ? comment : null
}
