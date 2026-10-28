/**
 * 社区（模拟）数据层。
 * - 纯本地假数据：示例帖用内置目的地库造真实感路线，不做假后端、不碰云。
 * - 帖子数据结构贴近 v1.15 的 TripSnapshot（结构化 nodes），使"复用路线"能导入规划器；
 *   并带 type/tripId 为 v1.17 "边走边发(ongoing)" 预留。
 * - 点赞/收藏互动状态存 localStorage，刷新保留。
 */
import { loadArray, save } from '../storage/store'
import { K } from '../storage/keys'
import { Destinations } from '../data/destinations'
import { getTrip, routeNodes } from './trip'
import type { Trip } from '../types'

export interface CommunityAuthor {
  name: string
  /** 头像占位首字（无真实头像时用首字+色相渲染） */
  avatarChar: string
  avatarHue: number
}

export type PostType = 'completed' | 'ongoing' // completed=静态快照；ongoing=边走边发(绑定 live trip)

export interface CommunityNode {
  key: string
  type: 'start' | 'waypoint' | 'destination'
  label: string
}

export interface CommunityComment {
  id: string
  postId: string
  author: CommunityAuthor
  text: string
  createdAt: number
}

export interface CommunityPost {
  id: string
  /** 本期恒 'completed'；'ongoing' 为 v1.17 预留 */
  type: PostType
  /** ongoing 预留：引用 live trip；completed 为 null */
  tripId: string | null
  author: CommunityAuthor
  routeTitle: string
  /** 结构化节点（start→waypoint→destination），供"复用路线"导入规划器 */
  nodes: CommunityNode[]
  location: string
  days: number
  diarySummary: string
  /** 占位封面渐变色相（无真实照片，本地渲染手账渐变） */
  photoHue: number
  likes: number
  comments: number
  saves: number
  createdAt: number
}

interface PostInteraction {
  liked: boolean
  saved: boolean
}

const H = 24 * 60 * 60 * 1000

/** 内置示例帖（v1.16 只含 completed；数据本地生成，确定性可见） */
const SEED: Omit<CommunityPost, 'routeTitle' | 'createdAt'>[] = [
  {
    id: 'post_huaying',
    type: 'completed',
    tripId: null,
    author: { name: '山野老周', avatarChar: '周', avatarHue: 118 },
    nodes: [
      { key: 'n1', type: 'start', label: '广安' },
      { key: 'n2', type: 'destination', label: '广安·华蓥山' },
    ],
    location: '广安·华蓥山',
    days: 2,
    diarySummary: '早起爬华蓥山，石林在云海里若隐若现，高山草原风特别大。天池边坐了一下午，值得。',
    photoHue: 130,
    likes: 42,
    comments: 6,
    saves: 18,
  },
  {
    id: 'post_chengdu',
    type: 'completed',
    tripId: null,
    author: { name: '锦里闲人', avatarChar: '锦', avatarHue: 24 },
    nodes: [
      { key: 'n1', type: 'start', label: '广安' },
      { key: 'n2', type: 'waypoint', label: '四川·成都' },
      { key: 'n3', type: 'destination', label: '四川·青城山—都江堰' },
    ],
    location: '四川·青城山—都江堰',
    days: 3,
    diarySummary: '成都先吃两天，再去青城山后山，清幽到能听到心跳。都江堰的水声太大了，震撼。',
    photoHue: 40,
    likes: 87,
    comments: 12,
    saves: 35,
  },
  {
    id: 'post_jiuzhaigou',
    type: 'completed',
    tripId: null,
    author: { name: '川藏线小柒', avatarChar: '柒', avatarHue: 190 },
    nodes: [
      { key: 'n1', type: 'start', label: '四川·成都' },
      { key: 'n2', type: 'destination', label: '四川·九寨沟' },
    ],
    location: '四川·九寨沟',
    days: 4,
    diarySummary: '五花海的水蓝得不像真的，秋季彩林倒影美到词穷。往返盘山路太久了，建议预留两天在路上。',
    photoHue: 210,
    likes: 156,
    comments: 20,
    saves: 62,
  },
  {
    id: 'post_yading',
    type: 'completed',
    tripId: null,
    author: { name: '半夏', avatarChar: '半', avatarHue: 300 },
    nodes: [
      { key: 'n1', type: 'start', label: '四川·成都' },
      { key: 'n2', type: 'waypoint', label: '四川·峨眉山' },
      { key: 'n3', type: 'destination', label: '四川·稻城亚丁' },
    ],
    location: '四川·稻城亚丁',
    days: 6,
    diarySummary: '从峨眉一路向西到亚丁，牛奶海、五色海都去了。海拔四千五，高反是真的，但值回票价。',
    photoHue: 265,
    likes: 203,
    comments: 31,
    saves: 88,
  },
  {
    id: 'post_zhangjiajie',
    type: 'completed',
    tripId: null,
    author: { name: '峰林行者', avatarChar: '峰', avatarHue: 200 },
    nodes: [
      { key: 'n1', type: 'start', label: '湖南·张家界' },
      { key: 'n2', type: 'destination', label: '湖南·张家界' },
    ],
    location: '湖南·张家界',
    days: 3,
    diarySummary: '天子山的石英砂岩峰林，栈道贴壁走，恐高慎入。玻璃桥往下看腿软，但也爽。',
    photoHue: 175,
    likes: 98,
    comments: 9,
    saves: 41,
  },
  {
    id: 'post_dali_lijiang',
    type: 'completed',
    tripId: null,
    author: { name: '滇南的风', avatarChar: '滇', avatarHue: 320 },
    nodes: [
      { key: 'n1', type: 'start', label: '云南·大理' },
      { key: 'n2', type: 'waypoint', label: '云南·丽江' },
      { key: 'n3', type: 'destination', label: '云南·丽江' },
    ],
    location: '云南·丽江',
    days: 5,
    diarySummary: '大理洱海环了一圈，丽江古城住两天，晚上酒吧街很热闹。雪山看不腻。',
    photoHue: 330,
    likes: 121,
    comments: 15,
    saves: 54,
  },
  {
    id: 'post_sanya',
    type: 'completed',
    tripId: null,
    author: { name: '椰岛阿浪', avatarChar: '浪', avatarHue: 35 },
    nodes: [
      { key: 'n1', type: 'start', label: '海南·三亚' },
      { key: 'n2', type: 'destination', label: '海南·三亚' },
    ],
    location: '海南·三亚',
    days: 4,
    diarySummary: '亚龙湾的水清得能见底，浮潜看到好多鱼。蜈支洲岛人多，建议早去。防晒一定带够。',
    photoHue: 30,
    likes: 134,
    comments: 18,
    saves: 47,
  },
  {
    id: 'post_dunhuang',
    type: 'completed',
    tripId: null,
    author: { name: '丝路旅人', avatarChar: '丝', avatarHue: 15 },
    nodes: [
      { key: 'n1', type: 'start', label: '陕西·西安' },
      { key: 'n2', type: 'waypoint', label: '甘肃·敦煌' },
      { key: 'n3', type: 'destination', label: '甘肃·敦煌' },
    ],
    location: '甘肃·敦煌',
    days: 5,
    diarySummary: '莫高窟的壁画看一次少一次，提前一个月约的票。鸣沙山日落绝了，骑骆驼一路晃到山顶。',
    photoHue: 18,
    likes: 178,
    comments: 24,
    saves: 73,
  },
  {
    id: 'post_hulunbuir',
    type: 'completed',
    tripId: null,
    author: { name: '草原牧歌', avatarChar: '牧', avatarHue: 110 },
    nodes: [
      { key: 'n1', type: 'start', label: '北京' },
      { key: 'n2', type: 'destination', label: '内蒙古·呼伦贝尔' },
    ],
    location: '内蒙古·呼伦贝尔',
    days: 6,
    diarySummary: '草原一望无际，住了蒙古包看银河，星空亮到眼睛疼。骑马三小时屁股酸，值。',
    photoHue: 95,
    likes: 92,
    comments: 11,
    saves: 39,
  },
  {
    id: 'post_kyoto_tokyo',
    type: 'completed',
    tripId: null,
    author: { name: '在路上的橘子', avatarChar: '橘', avatarHue: 22 },
    nodes: [
      { key: 'n1', type: 'start', label: '日本·京都' },
      { key: 'n2', type: 'waypoint', label: '日本·东京' },
      { key: 'n3', type: 'destination', label: '日本·东京' },
    ],
    location: '日本·东京',
    days: 7,
    diarySummary: '京都的寺庙和枫叶，东京的霓虹和拉面，两种世界。秋天去真的美到窒息。',
    photoHue: 20,
    likes: 164,
    comments: 22,
    saves: 66,
  },
  {
    id: 'post_huangshan',
    type: 'completed',
    tripId: null,
    author: { name: '云海拾阶', avatarChar: '云', avatarHue: 200 },
    nodes: [
      { key: 'n1', type: 'start', label: '安徽·黄山' },
      { key: 'n2', type: 'waypoint', label: '安徽·黄山' },
      { key: 'n3', type: 'destination', label: '安徽·黄山' },
    ],
    location: '安徽·黄山',
    days: 3,
    diarySummary: '光明顶看日出，云海在脚下翻涌。莲花峰走一环二环，奇松怪石看一天都不腻。',
    photoHue: 210,
    likes: 76,
    comments: 8,
    saves: 33,
  },
]

function routeTitle(nodes: CommunityNode[]): string {
  return nodes.map((n) => n.label).join(' → ') || '未命名的路线'
}

const KNOWN = new Set(SEED.map((p) => p.id))

/** 用户发布的 ongoing 帖（边走边发）：绑定 live trip + 已发布日记条目 id */
export interface UserOngoingPost {
  id: string
  type: 'ongoing'
  tripId: string
  author: CommunityAuthor
  routeTitle: string
  nodes: CommunityNode[]
  location: string
  days: number
  publishedEntryIds: string[]
  createdAt: number
  updatedAt: number
}

/** 用户行程收尾产生的 completed 帖（内容固化，不依赖 live trip） */
export interface UserCompletedPost {
  id: string
  type: 'completed'
  tripId: string | null
  author: CommunityAuthor
  routeTitle: string
  nodes: CommunityNode[]
  location: string
  days: number
  entries: { text: string; photoIds: string[] }[]
  createdAt: number
}

/** seed 评论（每帖内置 1~3 条假昵称；用户新增评论单独持久化在 travel:v1:community-comments） */
const SEED_COMMENTS: Record<string, { author: CommunityAuthor; text: string }[]> = {
  post_huaying: [
    { author: { name: '山间清风', avatarChar: '清', avatarHue: 150 }, text: '华蓥山的云海真的绝，早去人少' },
    { author: { name: '拾光', avatarChar: '拾', avatarHue: 35 }, text: '天池边发呆一整天，适合放空' },
  ],
  post_chengdu: [
    { author: { name: '川味小馆', avatarChar: '川', avatarHue: 20 }, text: '成都先吃三天才够味' },
    { author: { name: '青城客', avatarChar: '青', avatarHue: 130 }, text: '青城后山清幽，值得' },
    { author: { name: '旅行的意义', avatarChar: '旅', avatarHue: 210 }, text: '都江堰的水声太震撼了' },
  ],
  post_jiuzhaigou: [
    { author: { name: '阿坝的云', avatarChar: '云', avatarHue: 200 }, text: '五花海的水蓝到不真实' },
    { author: { name: '秋色', avatarChar: '秋', avatarHue: 30 }, text: '彩林季去最美，记得预留路上时间' },
  ],
  post_yading: [
    { author: { name: '高原红', avatarChar: '红', avatarHue: 0 }, text: '牛奶海值得，但高反不是开玩笑的' },
    { author: { name: '山川', avatarChar: '山', avatarHue: 120 }, text: '峨眉到亚丁这条路本身就很美' },
  ],
  post_zhangjiajie: [
    { author: { name: '峰云', avatarChar: '峰', avatarHue: 190 }, text: '玻璃桥往下看是真的腿软' },
  ],
  post_dali_lijiang: [
    { author: { name: '洱海的风', avatarChar: '洱', avatarHue: 210 }, text: '大理环洱海适合慢慢骑' },
    { author: { name: '古城小住', avatarChar: '古', avatarHue: 40 }, text: '丽江古城夜景很热闹' },
  ],
  post_sanya: [
    { author: { name: '海浪', avatarChar: '浪', avatarHue: 35 }, text: '蜈支洲岛早去，人多到怀疑人生' },
    { author: { name: '椰子水', avatarChar: '椰', avatarHue: 100 }, text: '防晒一定带够，晒伤后悔' },
  ],
  post_dunhuang: [
    { author: { name: '壁画迷', avatarChar: '壁', avatarHue: 18 }, text: '莫高窟要提前约票，看一次少一次' },
    { author: { name: '沙丘', avatarChar: '沙', avatarHue: 30 }, text: '鸣沙山日落真的值得' },
  ],
  post_hulunbuir: [
    { author: { name: '草原的星', avatarChar: '星', avatarHue: 110 }, text: '蒙古包看银河，星空亮到眼睛疼' },
  ],
  post_kyoto_tokyo: [
    { author: { name: '枫叶', avatarChar: '枫', avatarHue: 22 }, text: '京都秋天美到窒息' },
    { author: { name: '霓虹', avatarChar: '霓', avatarHue: 300 }, text: '东京的拉面深夜也好吃' },
  ],
  post_huangshan: [
    { author: { name: '云海客', avatarChar: '云', avatarHue: 200 }, text: '光明顶日出值回所有体力' },
    { author: { name: '怪石', avatarChar: '怪', avatarHue: 150 }, text: '莲花峰走一圈，奇松怪石看一天不腻' },
  ],
}

function isCommentEntry(x: unknown): x is [string, string] {
  return Array.isArray(x) && x.length === 2 && typeof x[0] === 'string' && typeof x[1] === 'string'
}

/** 广场帖：SEED completed + 用户 ongoing/completed（合并，ongoing 聚合 live trip 最新） */
export function getCommunityPosts(): CommunityPost[] {
  const now = Date.now()
  const seed = SEED.map((p, i) => ({
    ...p,
    routeTitle: routeTitle(p.nodes),
    createdAt: now - i * 3 * H - Math.floor(i * 17) * H,
  }))
  const user = getUserPosts().map(toCommunityPost)
  return [...seed, ...user]
}

function getInteractions(): Record<string, PostInteraction> {
  return loadArray<[string, PostInteraction]>(
    K.communityInteractions,
    (x): x is [string, PostInteraction] => Array.isArray(x) && x.length === 2 && typeof x[0] === 'string',
    [],
  ).reduce<Record<string, PostInteraction>>((acc, [id, v]) => {
    acc[id] = v
    return acc
  }, {})
}

function saveInteractions(map: Record<string, PostInteraction>): void {
  save(K.communityInteractions, Object.entries(map))
}

export function getInteractionState(): Record<string, PostInteraction> {
  return getInteractions()
}

/** 切换某帖点赞态，返回新 liked 值；未知 id 返回 false 不写入 */
export function togglePostLike(id: string): boolean {
  if (!isKnownId(id)) return false
  const map = getInteractions()
  const cur = map[id] ?? { liked: false, saved: false }
  cur.liked = !cur.liked
  map[id] = cur
  saveInteractions(map)
  return cur.liked
}

/** 切换某帖收藏态，返回新 saved 值；未知 id 返回 false 不写入 */
export function togglePostSave(id: string): boolean {
  if (!isKnownId(id)) return false
  const map = getInteractions()
  const cur = map[id] ?? { liked: false, saved: false }
  cur.saved = !cur.saved
  map[id] = cur
  saveInteractions(map)
  return cur.saved
}

/** 某帖全部评论：用户新增（最新在前）+ seed 内置评论 */
export function getCommentsForPost(postId: string): CommunityComment[] {
  const mine = loadArray<[string, string]>(K.communityComments, isCommentEntry, [])
    .filter(([id]) => id === postId)
    .map(([, text], i) => ({
      id: `cm_${postId}_${i}`,
      postId,
      author: { name: '我', avatarChar: '我', avatarHue: 300 },
      text,
      createdAt: Date.now() - i,
    }))
  const seed = (SEED_COMMENTS[postId] ?? []).map((s, i) => ({
    id: `c_${postId}_${i}`,
    postId,
    author: s.author,
    text: s.text,
    createdAt: Date.now() - (i + 1) * H,
  }))
  return [...mine, ...seed]
}

/** 某帖评论数（seed + 用户新增；全局统一口径） */
export function commentCount(postId: string): number {
  return getCommentsForPost(postId).length
}

/** 新增评论（作者固定"我"）。未知 postId 或空白文本返回 false 不写入 */
export function addComment(postId: string, text: string): boolean {
  if (!isKnownId(postId)) return false
  const t = text.trim()
  if (!t) return false
  const arr = loadArray<[string, string]>(K.communityComments, isCommentEntry, [])
  arr.unshift([postId, t])
  save(K.communityComments, arr)
  return true
}

/* ---------------- 边走边发 ongoing ---------------- */

function isOngoingEntry(x: unknown): x is UserOngoingPost {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return o.type === 'ongoing' && typeof o.id === 'string' && typeof o.tripId === 'string' && Array.isArray(o.publishedEntryIds)
}

function isCompletedEntry(x: unknown): x is UserCompletedPost {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return o.type === 'completed' && typeof o.id === 'string' && Array.isArray(o.entries)
}

function destName(id: string): string {
  return Destinations.find((d) => d.id === id)?.name ?? id
}

/** trip → 社区帖结构化节点（start/waypoint/destination 均带 label） */
function tripToCommunityNodes(trip: Trip): CommunityNode[] {
  return routeNodes(trip).map((n) => ({
    key: n.key,
    type: n.type,
    label: n.label ?? (n.destinationId ? destName(n.destinationId) : ''),
  }))
}

/** 用户已发布帖（ongoing + completed） */
export function getUserPosts(): (UserOngoingPost | UserCompletedPost)[] {
  return [
    ...loadArray<UserOngoingPost>(K.communityOngoing, isOngoingEntry, []),
    ...loadArray<UserCompletedPost>(K.communityCompleted, isCompletedEntry, []),
  ]
}

/** 互动守卫：SEED 帖 + 用户帖均可互动；未知 id 拒绝 */
function isKnownId(id: string): boolean {
  if (KNOWN.has(id)) return true
  return getUserPosts().some((p) => p.id === id)
}

/** ongoing 帖聚合 live trip 已发布日记里最新一条有文字的（兜底 null） */
function latestPublishedText(og: UserOngoingPost): string | null {
  const t = getTrip()
  if (!t || t.id !== og.tripId) return null
  for (const id of [...og.publishedEntryIds].reverse()) {
    const e = t.diary.find((x) => x.id === id)
    if (e?.text) return e.text
  }
  return null
}

/** 用户帖 → 广场可渲染的 CommunityPost 形状 */
function toCommunityPost(p: UserOngoingPost | UserCompletedPost): CommunityPost {
  const summary =
    p.type === 'completed'
      ? (p.entries[p.entries.length - 1]?.text ?? p.routeTitle)
      : (latestPublishedText(p) ?? p.routeTitle)
  return {
    id: p.id,
    type: p.type,
    tripId: p.type === 'ongoing' ? p.tripId : p.tripId,
    author: p.author,
    routeTitle: p.routeTitle,
    nodes: p.nodes,
    location: p.location,
    days: p.days,
    diarySummary: summary,
    photoHue: 120,
    likes: 0,
    comments: commentCount(p.id),
    saves: 0,
    createdAt: p.createdAt,
  }
}

/** 按 trip 查 ongoing 帖（无则 null） */
export function getOngoingByTrip(tripId: string): UserOngoingPost | null {
  return loadArray<UserOngoingPost>(K.communityOngoing, isOngoingEntry, []).find((x) => x.tripId === tripId) ?? null
}

/**
 * 发布某条日记到社区（手动选择粒度）。首次创建 ongoing 帖，重复发布追加 publishedEntryIds。
 * tripId 不匹配 / 未出发 / 日记条目不存在 → false。
 */
export function publishDiaryEntry(tripId: string, entryId: string, trip: Trip): boolean {
  if (trip.id !== tripId || !trip.departed) return false
  if (!trip.diary.some((e) => e.id === entryId)) return false
  const arr = loadArray<UserOngoingPost>(K.communityOngoing, isOngoingEntry, [])
  let og = arr.find((x) => x.tripId === tripId)
  if (!og) {
    const nodes = tripToCommunityNodes(trip)
    og = {
      id: `ongoing_${tripId}`,
      type: 'ongoing',
      tripId,
      author: { name: '我', avatarChar: '我', avatarHue: 300 },
      routeTitle: nodes.map((n) => n.label).join(' → ') || '未命名的路线',
      nodes,
      location: nodes[nodes.length - 1]?.label ?? '',
      days: trip.totalDays,
      publishedEntryIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    arr.unshift(og)
  }
  if (!og.publishedEntryIds.includes(entryId)) {
    og.publishedEntryIds.push(entryId)
    og.updatedAt = Date.now()
  }
  save(K.communityOngoing, arr)
  return true
}

/**
 * 行程完成收尾：ongoing 帖已发布日记固化成 completed 快照（entries 不再依赖 live trip），从 ongoing 移除。
 * 无 ongoing → false。
 */
export function finalizeOngoing(tripId: string, trip: Trip): boolean {
  const arr = loadArray<UserOngoingPost>(K.communityOngoing, isOngoingEntry, [])
  const og = arr.find((x) => x.tripId === tripId)
  if (!og) return false
  save(K.communityOngoing, arr.filter((x) => x !== og))
  const entries = og.publishedEntryIds
    .map((id) => trip.diary.find((e) => e.id === id))
    .filter((e): e is Trip['diary'][number] => !!e)
    .map((e) => ({ text: e.text, photoIds: e.photoIds }))
  const cp: UserCompletedPost = {
    id: `cp_${tripId}`,
    type: 'completed',
    tripId: null,
    author: og.author,
    routeTitle: og.routeTitle,
    nodes: og.nodes,
    location: og.location,
    days: og.days,
    entries,
    createdAt: Date.now(),
  }
  const cps = loadArray<UserCompletedPost>(K.communityCompleted, isCompletedEntry, [])
  cps.unshift(cp)
  save(K.communityCompleted, cps)
  return true
}
