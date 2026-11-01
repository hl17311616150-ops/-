/**
 * 内置种子评论数据层（Plan 7 · Task 3 · Step 3）：
 * - 仅离线确定性假数据，不读写 localStorage、不依赖 Date.now()；
 * - 6 篇内置帖各配 2–3 条顶层评论与 1–2 条回复；
 * - 每帖恰有一条 isAuthor:true，作者取该帖 COMMUNITY_POSTS 的 post.author，其余为访客假昵称；
 * - CommentData 在此定义并导出，供 comments.ts 与测试复用。
 */

import { COMMUNITY_POSTS } from '../../data/community'
import type { CommunityAuthor } from '../../data/community'

/** 一条社区评论：顶层 parentId=null；回复 parentId 指向同帖某条顶层评论 id */
export interface CommentData {
  id: string
  postId: string
  author: CommunityAuthor
  text: string
  createdAt: number
  likes: number
  parentId: string | null
  isAuthor: boolean
}

/** 种子时间固定基准：2026-10-12 10:00（本地时区构造），再按序号做单调分钟偏移 */
export const SEED_BASE_TS = new Date(2026, 9, 12, 10, 0).getTime()

/** 偏移步长：每条评论 +1 分钟，保证同帖内顶层早于回复、全局单调递增 */
const OFFSET_STEP_MS = 60_000

/** 访客假作者池：形状对齐 CommunityAuthor，离线演示用，不绑定真实账号 */
const GUEST_XIAK: CommunityAuthor = {
  id: 'guest_xiak',
  name: '背包侠客',
  avatarChar: '侠',
  avatarColor: 'hsl(350 60% 55%)',
  location: '重庆',
}

const GUEST_YUNSHANG: CommunityAuthor = {
  id: 'guest_yunshang',
  name: '云上漫步',
  avatarChar: '漫',
  avatarColor: 'hsl(260 50% 55%)',
  location: '昆明',
}

const GUEST_BASHI: CommunityAuthor = {
  id: 'guest_bashi',
  name: '夜行巴士',
  avatarChar: '巴',
  avatarColor: 'hsl(40 60% 50%)',
  location: '长沙',
}

const GUEST_ZHUIFENG: CommunityAuthor = {
  id: 'guest_zhuifeng',
  name: '山野追风',
  avatarChar: '追',
  avatarColor: 'hsl(150 45% 45%)',
  location: '贵阳',
}

const GUEST_SHIBEI: CommunityAuthor = {
  id: 'guest_shibei',
  name: '海边拾贝',
  avatarChar: '贝',
  avatarColor: 'hsl(190 55% 50%)',
  location: '南宁',
}

const GUEST_TINGXUE: CommunityAuthor = {
  id: 'guest_tingxue',
  name: '北岛听雪',
  avatarChar: '雪',
  avatarColor: 'hsl(210 45% 60%)',
  location: '长春',
}

interface TopSpec {
  author: CommunityAuthor
  text: string
  likes: number
}

interface ReplySpec {
  /** 挂载到第几条顶层评论（0-based，对应 plan.tops 顺序） */
  parentIndex: number
  author: CommunityAuthor
  text: string
  likes: number
  /** true 表示该回复为帖子作者本人回复，作者字段改用 post.author */
  isAuthor: boolean
}

interface PostPlan {
  postId: string
  tops: TopSpec[]
  replies: ReplySpec[]
}

/**
 * 种子评论规划：顶层在前、回复在后；isAuthor:true 恒为作者回复，
 * 作者对象在装配时从 COMMUNITY_POSTS 对应帖子取出，保证与帖内作者逐字一致。
 */
const SEED_PLAN: readonly PostPlan[] = [
  {
    postId: 'chuanxi',
    tops: [
      { author: GUEST_XIAK, text: '新都桥的秋天真的绝，求一份具体行程！', likes: 42 },
      { author: GUEST_YUNSHANG, text: '甲居藏寨住了一晚，早上被炊烟叫醒，太治愈了。', likes: 35 },
      { author: GUEST_BASHI, text: '四姑娘山十月还能看见雪顶吗？打算下个月出发。', likes: 18 },
    ],
    replies: [
      { parentIndex: 0, author: GUEST_ZHUIFENG, text: '同求，楼主方便的话可以私发路线图吗。', likes: 6, isAuthor: false },
      {
        parentIndex: 0,
        author: GUEST_XIAK,
        text: '路线在帖子节点里都标了，成都出发五天足够，注意带厚外套。',
        likes: 12,
        isAuthor: true,
      },
    ],
  },
  {
    postId: 'dianxibei',
    tops: [
      { author: GUEST_SHIBEI, text: '洱海骑行那段太向往了，自行车是租的吗？', likes: 28 },
      { author: GUEST_XIAK, text: '梅里日照金山看到了吗？我们上次去全被云挡住了。', likes: 24 },
      { author: GUEST_TINGXUE, text: '古城夜里安全吗，一个人逛会不会偏暗。', likes: 9 },
    ],
    replies: [
      {
        parentIndex: 1,
        author: GUEST_XIAK,
        text: '我们运气好，主峰露了大概十分钟；建议早点到观景台占位置。',
        likes: 15,
        isAuthor: true,
      },
    ],
  },
  {
    postId: 'wannan',
    tops: [
      { author: GUEST_BASHI, text: '月沼清晨真的没人，照片里像水墨画，楼主拍得太好了。', likes: 31 },
      { author: GUEST_ZHUIFENG, text: '塔川乌桕什么时候最红？11 月初去来得及吗？', likes: 14 },
    ],
    replies: [
      { parentIndex: 0, author: GUEST_YUNSHANG, text: '宏村住宿有推荐吗，想住临湖的那家。', likes: 5, isAuthor: false },
      {
        parentIndex: 1,
        author: GUEST_XIAK,
        text: '11 月上旬颜色最好，住黟县县城比景区里安静。',
        likes: 10,
        isAuthor: true,
      },
    ],
  },
  {
    postId: 'qinggan',
    tops: [
      { author: GUEST_TINGXUE, text: '戈壁公路这段真的震撼，车少风大，注意防晒。', likes: 38 },
      { author: GUEST_SHIBEI, text: '茶卡风大的时候镜面就没了吗，好想去看天空之镜。', likes: 22 },
      { author: GUEST_XIAK, text: '大环线一天开车多久，新手自驾会不会累？', likes: 11 },
    ],
    replies: [
      {
        parentIndex: 2,
        author: GUEST_XIAK,
        text: '最长一天大概五小时车程，分段走不赶；有师傅比新手更稳妥。',
        likes: 9,
        isAuthor: true,
      },
    ],
  },
  {
    postId: 'hainan',
    tops: [
      { author: GUEST_ZHUIFENG, text: '万宁冲浪初学几节课能站起来？楼主在哪家学的？', likes: 26 },
      { author: GUEST_BASHI, text: '三亚日落点推荐一个人少的，不想挤沙滩。', likes: 13 },
    ],
    replies: [
      { parentIndex: 0, author: GUEST_SHIBEI, text: '我两节就能站板了，摔得浑身沙但开心。', likes: 7, isAuthor: false },
      {
        parentIndex: 1,
        author: GUEST_XIAK,
        text: '清水湾傍晚人少，顺着海岸线往东边走两百米就清净了。',
        likes: 11,
        isAuthor: true,
      },
    ],
  },
  {
    postId: 'dongbei',
    tops: [
      { author: GUEST_YUNSHANG, text: '雪乡红灯笼配积雪檐，夜里真像童话，冷到几度？', likes: 33 },
      { author: GUEST_TINGXUE, text: '长白山天池风大不大？一月份去需要穿多厚。', likes: 20 },
      { author: GUEST_ZHUIFENG, text: '雾凇只有早上七点才有吗，睡过头就错过了？', likes: 8 },
    ],
    replies: [
      {
        parentIndex: 2,
        author: GUEST_XIAK,
        text: '七点前后最盛，八点后太阳一上来霜花就开始化，定闹钟早起。',
        likes: 13,
        isAuthor: true,
      },
    ],
  },
]

/** 装配：按 COMMUNITY_POSTS 顺序遍历，全局递增序号换算确定性 createdAt */
function buildSeedComments(): CommentData[] {
  const out: CommentData[] = []
  let ordinal = 0

  for (const post of COMMUNITY_POSTS) {
    const plan = SEED_PLAN.find((p) => p.postId === post.id)
    if (!plan) continue

    const topIds: string[] = []
    plan.tops.forEach((top, index) => {
      ordinal += 1
      const id = `seed_${post.id}_c${index + 1}`
      topIds.push(id)
      out.push({
        id,
        postId: post.id,
        author: top.author,
        text: top.text,
        createdAt: SEED_BASE_TS + ordinal * OFFSET_STEP_MS,
        likes: top.likes,
        parentId: null,
        isAuthor: false,
      })
    })

    plan.replies.forEach((reply, index) => {
      ordinal += 1
      out.push({
        id: `seed_${post.id}_r${index + 1}`,
        postId: post.id,
        author: reply.isAuthor ? post.author : reply.author,
        text: reply.text,
        createdAt: SEED_BASE_TS + ordinal * OFFSET_STEP_MS,
        likes: reply.likes,
        parentId: topIds[reply.parentIndex],
        isAuthor: reply.isAuthor,
      })
    })
  }

  return out
}

/** 内置种子评论（只读；用户评论由 comments.ts 另行持久化合并） */
export const SEED_COMMENTS: readonly CommentData[] = buildSeedComments()
