/**
 * 用户帖数据层（Plan 7 · Task 2）：
 * - 当前用户、封面候选、发布草稿等类型与常量；
 * - ongoing（边走边发）/ completed（整理并发布）两 key 的加载、形状守卫与装配；
 * - 行程 → 路线节点映射、草稿构建、单条日记追加为 ongoing、整帖固化为 completed。
 *
 * 容错口径与 store.ts 一致：损坏 / 形状错误 / 标量占位的数据一律过滤或回退，
 * 不抛错、不白屏；纯本地 localStorage，不联网、不接后端。
 */

import { save, loadArray } from '../../storage/store'
import { K } from '../../storage/keys'
import { COMMUNITY_POSTS } from '../../data/community'
import type { CommunityAuthor, CommunityPost } from '../../data/community'
import { POIS } from '../../data/pois'
import type { DiaryEntry, Trip } from '../../types'
import chuanxiImg from '../../assets/home/card-chuanxi.jpg'
import dianxibeiImg from '../../assets/home/card-dianxibei.jpg'
import wannanImg from '../../assets/home/card-wannan.jpg'
import qingganImg from '../../assets/home/card-qinggan.jpg'
import hainanImg from '../../assets/home/card-hainan.jpg'
import dongbeiImg from '../../assets/home/card-dongbei.jpg'

/** 用户帖可见范围：公开 / 好友 / 仅自己 */
export type PostVisibility = 'public' | 'friends' | 'self'

/** 持久化用户帖：在社区帖形状上额外绑定来源行程 id 与可见范围 */
export interface StoredPost extends CommunityPost {
  tripId: string
  visibility: PostVisibility
}

/** 发布编辑页草稿（受控状态载体，不直接落库） */
export interface PublishDraft {
  title: string
  cover: string
  visibility: PostVisibility
  selectedEntryIds: string[]
  nodes: string[]
}

/** 当前登录用户（单用户本地；v2 上云时替换为账号资料） */
export const CURRENT_USER: CommunityAuthor = {
  id: 'me',
  name: '我',
  avatarChar: '我',
  avatarColor: 'hsl(150 42% 52%)',
  location: '广安',
}

/** 封面候选：顺序锁定 chuanxi → dianxibei → wannan → qinggan → hainan → dongbei */
export const COVER_OPTIONS: readonly string[] = [
  chuanxiImg,
  dianxibeiImg,
  wannanImg,
  qingganImg,
  hainanImg,
  dongbeiImg,
]

/** 标题空白兜底文案 */
const DEFAULT_TITLE = '我的山野游记'

/** 行程节点为空时的兜底路线（对齐内置川西路线） */
const DEFAULT_NODES: readonly string[] = ['成都', '康定', '新都桥', '丹巴']

/** 新帖默认难度 / 分类 / 里程（本地演示，后续可由行程数据推算） */
const DEFAULT_DIFFICULTY: CommunityPost['difficulty'] = '中等'
const DEFAULT_CATEGORY = '自驾'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * StoredPost 形状守卫：普通对象且含非空 string id / tripId、
 * status 为 ongoing|completed、entries 为数组；其余字段交由上层渲染容错。
 * 坏条目由 loadArray 逐项过滤，不抛错。
 */
export function isStoredPost(item: unknown): item is StoredPost {
  if (!isPlainObject(item)) return false
  if (typeof item.id !== 'string' || item.id === '') return false
  if (typeof item.tripId !== 'string' || item.tripId === '') return false
  if (item.status !== 'ongoing' && item.status !== 'completed') return false
  if (!Array.isArray(item.entries)) return false
  return true
}

/** 合并 ongoing / completed 两 key 的合法用户帖（先进行中、后已收尾） */
export function loadStoredPosts(): StoredPost[] {
  return [
    ...loadArray<StoredPost>(K.communityOngoing, isStoredPost),
    ...loadArray<StoredPost>(K.communityCompleted, isStoredPost),
  ]
}

/** 去掉持久化专属字段 tripId / visibility，还原为社区通用帖形状 */
export function toCommunityPost(sp: StoredPost): CommunityPost {
  const { tripId: _tripId, visibility: _visibility, ...rest } = sp
  return rest
}

/** 内置种子帖 + 当前用户帖，供社区列表 / 详情统一消费 */
export function getAllPosts(): CommunityPost[] {
  return [...COMMUNITY_POSTS, ...loadStoredPosts().map(toCommunityPost)]
}

/** 按 id 查帖（种子帖与用户帖统一命名空间）；未命中返回 undefined，不抛错 */
export function getAnyPostById(id: string): CommunityPost | undefined {
  return getAllPosts().find((p) => p.id === id)
}

/** 单个路线点映射：命中 POI 库取名称，未命中保留原 id / 城市名 */
function resolveNodeLabel(raw: string): string {
  const poi = POIS.find((p) => p.id === raw)
  return poi ? poi.name : raw
}

/**
 * 行程 → 路线节点：出发点 → 途经点 → 目的地，依次经 POIS 映射名称；
 * 空值跳过，结果按出现顺序去重；映射后为空时返回空数组（由调用方兜底）。
 */
export function tripToNodes(trip: Trip): string[] {
  const candidates: string[] = []
  if (typeof trip.startPoint === 'string' && trip.startPoint.trim() !== '') {
    candidates.push(trip.startPoint.trim())
  }
  for (const wp of trip.waypoints) {
    if (typeof wp === 'string' && wp.trim() !== '') candidates.push(wp.trim())
  }
  if (typeof trip.destinationId === 'string' && trip.destinationId.trim() !== '') {
    candidates.push(trip.destinationId.trim())
  }
  const seen = new Set<string>()
  const nodes: string[] = []
  for (const raw of candidates) {
    const label = resolveNodeLabel(raw)
    if (!seen.has(label)) {
      seen.add(label)
      nodes.push(label)
    }
  }
  return nodes
}

/** 行程节点兜底：空路线用 DEFAULT_NODES */
function fallbackNodes(trip: Trip): string[] {
  const nodes = tripToNodes(trip)
  return nodes.length > 0 ? nodes : [...DEFAULT_NODES]
}

/** 标题兜底：空白（含纯空格）回退默认文案 */
function fallbackTitle(trip: Trip): string {
  const title = trip.title.trim()
  return title === '' ? DEFAULT_TITLE : title
}

/**
 * 发布草稿：标题空白兜底、默认全选当前 entries、可见范围 public、
 * 默认取第一张封面；节点空走 DEFAULT_NODES 兜底。
 */
export function buildDraft(trip: Trip, entries: DiaryEntry[]): PublishDraft {
  return {
    title: fallbackTitle(trip),
    cover: COVER_OPTIONS[0],
    visibility: 'public',
    selectedEntryIds: entries.map((e) => e.id),
    nodes: fallbackNodes(trip),
  }
}

/** 构建一条用户帖的公共字段（作者 / 互动计数 / 状态默认值） */
function basePostFields(trip: Trip): Pick<
  CommunityPost,
  'author' | 'days' | 'nights' | 'distanceKm' | 'difficulty' | 'dateRangeText' | 'likes' | 'comments' | 'collects' | 'featured' | 'category'
> {
  const days = typeof trip.totalDays === 'number' && trip.totalDays > 0 ? Math.floor(trip.totalDays) : 1
  return {
    author: CURRENT_USER,
    days,
    nights: Math.max(0, days - 1),
    distanceKm: 0,
    difficulty: DEFAULT_DIFFICULTY,
    dateRangeText: '',
    likes: 0,
    comments: 0,
    collects: 0,
    featured: false,
    category: DEFAULT_CATEGORY,
  }
}

/**
 * 边走边发：把单条日记追加到该行程的 ongoing 帖。
 * - 首次：新建 `ongoing_<tripId>` 帖写入 K.communityOngoing；
 * - 再次：命中同 tripId 的既有帖，按 entry id 去重后追加（保持原顺序）；
 * - 重复发布同一条不产生重复条目；返回落库后的帖。
 */
export function publishEntryToOngoing(trip: Trip, entry: DiaryEntry): StoredPost {
  const ongoing = loadArray<StoredPost>(K.communityOngoing, isStoredPost)
  const existing = ongoing.find((p) => p.tripId === trip.id)

  if (existing) {
    const entries = existing.entries.some((e) => e.id === entry.id)
      ? existing.entries
      : [...existing.entries, entry]
    const post: StoredPost = { ...existing, entries }
    save(K.communityOngoing, [...ongoing.filter((p) => p.tripId !== trip.id), post])
    return post
  }

  const post: StoredPost = {
    id: `ongoing_${trip.id}`,
    tripId: trip.id,
    title: fallbackTitle(trip),
    cover: COVER_OPTIONS[0],
    nodes: fallbackNodes(trip),
    entries: [entry],
    status: 'ongoing',
    visibility: 'public',
    ...basePostFields(trip),
  }
  save(K.communityOngoing, [...ongoing, post])
  return post
}

/**
 * 整理并发布：按 selectedEntryIds 过滤 entries（保持传入 entries 的原顺序），
 * 固化为 `completed_<tripId>` 帖；先移除该行程在 ongoing / completed 两 key 中的旧帖，
 * 再分别保存过滤后的 ongoing 列表与「过滤后 completed 列表 + 新帖」；重复发布覆盖旧帖。
 */
export function savePublishedPost(trip: Trip, entries: DiaryEntry[], draft: PublishDraft): StoredPost {
  const selected = entries.filter((e) => draft.selectedEntryIds.includes(e.id))

  const ongoing = loadArray<StoredPost>(K.communityOngoing, isStoredPost)
  const completed = loadArray<StoredPost>(K.communityCompleted, isStoredPost)

  const post: StoredPost = {
    id: `completed_${trip.id}`,
    tripId: trip.id,
    title: draft.title,
    cover: draft.cover,
    nodes: draft.nodes,
    entries: selected,
    status: 'completed',
    visibility: draft.visibility,
    ...basePostFields(trip),
  }

  const keptOngoing = ongoing.filter((p) => p.tripId !== trip.id)
  const keptCompleted = completed.filter((p) => p.tripId !== trip.id)

  save(K.communityOngoing, keptOngoing)
  save(K.communityCompleted, [...keptCompleted, post])
  return post
}
