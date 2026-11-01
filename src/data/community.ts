import type { Difficulty } from './hotRoutes'
import type { DiaryEntry } from '../types'
import chuanxiImg from '../assets/home/card-chuanxi.jpg'
import dianxibeiImg from '../assets/home/card-dianxibei.jpg'
import wannanImg from '../assets/home/card-wannan.jpg'
import qingganImg from '../assets/home/card-qinggan.jpg'
import hainanImg from '../assets/home/card-hainan.jpg'
import dongbeiImg from '../assets/home/card-dongbei.jpg'

/**
 * 社区离线数据（Plan 6 · Task 1）：
 * - 6 条帖子 id 与 HOT_ROUTES 逐字一致，消除首页热门卡片 → 社区详情的命名空间 404；
 * - 封面逐字复用对应本地图（与 HOT_ROUTES 同图）；
 * - 游记条目复用 src/types.ts 的 DiaryEntry 结构；photoIds 为确定性 id comm_<postId>_<n>；
 * - 纯本地假数据，不接后端、不联网；选择器在 src/lib/community/selectors.ts。
 */

export interface CommunityAuthor {
  id: string
  name: string
  avatarChar: string
  avatarColor: string
  location: string
}

export interface CommunityPost {
  id: string
  title: string
  author: CommunityAuthor
  cover: string
  days: number
  nights: number
  distanceKm: number
  difficulty: Difficulty
  dateRangeText: string
  nodes: string[]
  entries: DiaryEntry[]
  likes: number
  comments: number
  collects: number
  featured: boolean
  category: string
  status: 'ongoing' | 'completed'
}

/** 确定性时间戳：本地时区，不依赖 Date.now()，保证离线数据可复现 */
function ts(year: number, month: number, day: number, hour: number, minute: number): number {
  return new Date(year, month - 1, day, hour, minute, 0).getTime()
}

export const COMMUNITY_POSTS: readonly CommunityPost[] = [
  {
    id: 'chuanxi',
    title: '川西小环线 5 日',
    author: { id: 'author_laozhou', name: '山野老周', avatarChar: '周', avatarColor: 'hsl(118 55% 48%)', location: '成都' },
    cover: chuanxiImg,
    days: 5,
    nights: 4,
    distanceKm: 420,
    difficulty: '中等',
    dateRangeText: '10月8日–12日',
    nodes: ['成都', '康定', '新都桥', '丹巴', '四姑娘山'],
    entries: [
      {
        id: 'comm_chuanxi_e1',
        text: '新都桥的杨树全黄了，光影打在藏寨上，随手一拍都是桌面。',
        photoIds: ['comm_chuanxi_1', 'comm_chuanxi_2'],
        nodeId: null,
        createdAt: ts(2026, 10, 9, 9, 30),
        updatedAt: ts(2026, 10, 9, 9, 30),
      },
      {
        id: 'comm_chuanxi_e2',
        text: '甲居藏寨依山而建，早晨炊烟升起，像住进了画里。',
        photoIds: [],
        nodeId: null,
        createdAt: ts(2026, 10, 10, 8, 15),
        updatedAt: ts(2026, 10, 10, 8, 15),
      },
    ],
    likes: 186,
    comments: 24,
    collects: 73,
    featured: true,
    category: '自驾',
    status: 'completed',
  },
  {
    id: 'dianxibei',
    title: '滇西北 7 日',
    author: { id: 'author_xuefeng', name: '雪山与风', avatarChar: '风', avatarColor: 'hsl(210 55% 50%)', location: '大理' },
    cover: dianxibeiImg,
    days: 7,
    nights: 6,
    distanceKm: 680,
    difficulty: '中等',
    dateRangeText: '9月15日–21日',
    nodes: ['大理', '丽江', '香格里拉', '梅里'],
    entries: [
      {
        id: 'comm_dianxibei_e1',
        text: '洱海清晨的风很凉，水鸟贴着水面飞，沿湖骑了一上午。',
        photoIds: ['comm_dianxibei_1', 'comm_dianxibei_2'],
        nodeId: null,
        createdAt: ts(2026, 9, 16, 10, 20),
        updatedAt: ts(2026, 9, 16, 10, 20),
      },
      {
        id: 'comm_dianxibei_e2',
        text: '丽江古城夜里很热闹，四方街的灯火一直亮到很晚。',
        photoIds: ['comm_dianxibei_3'],
        nodeId: null,
        createdAt: ts(2026, 9, 18, 21, 5),
        updatedAt: ts(2026, 9, 18, 21, 5),
      },
      {
        id: 'comm_dianxibei_e3',
        text: '梅里雪山主峰在云缝里露了一瞬，同行的人都安静下来。',
        photoIds: ['comm_dianxibei_4', 'comm_dianxibei_5'],
        nodeId: null,
        createdAt: ts(2026, 9, 20, 7, 40),
        updatedAt: ts(2026, 9, 20, 7, 40),
      },
    ],
    likes: 152,
    comments: 18,
    collects: 61,
    featured: false,
    category: '徒步',
    status: 'completed',
  },
  {
    id: 'wannan',
    title: '皖南古村 6 日',
    author: { id: 'author_yunhai', name: '云海拾阶', avatarChar: '云', avatarColor: 'hsl(200 55% 50%)', location: '黄山' },
    cover: wannanImg,
    days: 6,
    nights: 5,
    distanceKm: 500,
    difficulty: '轻松',
    dateRangeText: '10月28日–11月2日',
    nodes: ['长沙', '景德镇', '黟县', '宏村', '呈坎'],
    entries: [
      {
        id: 'comm_wannan_e1',
        text: '清晨的月沼没有游客，白墙黛瓦倒映在水里，像一幅水墨画。',
        photoIds: ['comm_wannan_1', 'comm_wannan_2'],
        nodeId: 'hongcun-hongcun',
        createdAt: ts(2026, 10, 29, 7, 20),
        updatedAt: ts(2026, 10, 29, 7, 20),
      },
      {
        id: 'comm_wannan_e2',
        text: '塔川的乌桕树开始红了，层林尽染，和远山白墙黑瓦相映成画。',
        photoIds: ['comm_wannan_3', 'comm_wannan_4'],
        nodeId: 'yixian-tachuan',
        createdAt: ts(2026, 10, 30, 15, 20),
        updatedAt: ts(2026, 10, 30, 15, 20),
      },
      {
        id: 'comm_wannan_e3',
        text: '呈坎按八卦布局，三街九十九巷走着绕不出去，宝纶阁的木雕极为精美。',
        photoIds: ['comm_wannan_5', 'comm_wannan_6'],
        nodeId: 'chengkan-chengkan',
        createdAt: ts(2026, 10, 31, 9, 0),
        updatedAt: ts(2026, 10, 31, 9, 0),
      },
    ],
    likes: 98,
    comments: 12,
    collects: 45,
    featured: false,
    category: '古镇',
    status: 'ongoing',
  },
  {
    id: 'qinggan',
    title: '青甘大环线 7 日',
    author: { id: 'author_silvlu', name: '丝路旅人', avatarChar: '丝', avatarColor: 'hsl(28 55% 48%)', location: '西宁' },
    cover: qingganImg,
    days: 7,
    nights: 6,
    distanceKm: 1200,
    difficulty: '挑战',
    dateRangeText: '8月10日–16日',
    nodes: ['西宁', '青海湖', '茶卡盐湖', '翡翠湖', '敦煌'],
    entries: [
      {
        id: 'comm_qinggan_e1',
        text: '青海湖边油菜花海铺到山脚，风一吹全是浪。',
        photoIds: ['comm_qinggan_1', 'comm_qinggan_2'],
        nodeId: null,
        createdAt: ts(2026, 8, 11, 11, 10),
        updatedAt: ts(2026, 8, 11, 11, 10),
      },
      {
        id: 'comm_qinggan_e2',
        text: '茶卡盐湖的镜面效果要等风停，站在盐滩上像踩在云里。',
        photoIds: ['comm_qinggan_3', 'comm_qinggan_4'],
        nodeId: null,
        createdAt: ts(2026, 8, 12, 16, 40),
        updatedAt: ts(2026, 8, 12, 16, 40),
      },
      {
        id: 'comm_qinggan_e3',
        text: '戈壁公路笔直伸向天边，半天见不到一辆车，挑战的不只是路程。',
        photoIds: ['comm_qinggan_5'],
        nodeId: null,
        createdAt: ts(2026, 8, 14, 13, 30),
        updatedAt: ts(2026, 8, 14, 13, 30),
      },
    ],
    likes: 174,
    comments: 26,
    collects: 89,
    featured: false,
    category: '自驾',
    status: 'completed',
  },
  {
    id: 'hainan',
    title: '海南环岛 5 日',
    author: { id: 'author_lang', name: '椰岛阿浪', avatarChar: '浪', avatarColor: 'hsl(160 50% 45%)', location: '海口' },
    cover: hainanImg,
    days: 5,
    nights: 4,
    distanceKm: 460,
    difficulty: '轻松',
    dateRangeText: '7月20日–24日',
    nodes: ['海口', '文昌', '万宁', '三亚'],
    entries: [
      {
        id: 'comm_hainan_e1',
        text: '万宁的浪很适合初学冲浪，摔了一下午，傍晚终于站了起来。',
        photoIds: ['comm_hainan_1', 'comm_hainan_2'],
        nodeId: null,
        createdAt: ts(2026, 7, 22, 16, 0),
        updatedAt: ts(2026, 7, 22, 16, 0),
      },
      {
        id: 'comm_hainan_e2',
        text: '三亚的日落把海面烧成橘色，沙滩上坐了很久。',
        photoIds: ['comm_hainan_3', 'comm_hainan_4'],
        nodeId: null,
        createdAt: ts(2026, 7, 23, 18, 20),
        updatedAt: ts(2026, 7, 23, 18, 20),
      },
    ],
    likes: 131,
    comments: 15,
    collects: 52,
    featured: false,
    category: '海岛',
    status: 'completed',
  },
  {
    id: 'dongbei',
    title: '东北雪乡 6 日',
    author: { id: 'author_xuecun', name: '林海雪原', avatarChar: '林', avatarColor: 'hsl(220 45% 55%)', location: '哈尔滨' },
    cover: dongbeiImg,
    days: 6,
    nights: 5,
    distanceKm: 540,
    difficulty: '中等',
    dateRangeText: '1月12日–17日',
    nodes: ['哈尔滨', '雪乡', '长白山', '吉林'],
    entries: [
      {
        id: 'comm_dongbei_e1',
        text: '雪乡的木屋顶着厚厚的雪檐，夜里红灯笼映着雪，像童话世界。',
        photoIds: ['comm_dongbei_1', 'comm_dongbei_2'],
        nodeId: null,
        createdAt: ts(2026, 1, 13, 20, 10),
        updatedAt: ts(2026, 1, 13, 20, 10),
      },
      {
        id: 'comm_dongbei_e2',
        text: '长白山天池被风刮得只剩半边蓝，雪坡上滑下来比缆车刺激。',
        photoIds: ['comm_dongbei_3', 'comm_dongbei_4'],
        nodeId: null,
        createdAt: ts(2026, 1, 15, 10, 40),
        updatedAt: ts(2026, 1, 15, 10, 40),
      },
      {
        id: 'comm_dongbei_e3',
        text: '吉林雾凇在清晨七点最盛，沿江走一路，树枝上全是霜花。',
        photoIds: ['comm_dongbei_5'],
        nodeId: null,
        createdAt: ts(2026, 1, 17, 7, 0),
        updatedAt: ts(2026, 1, 17, 7, 0),
      },
    ],
    likes: 118,
    comments: 14,
    collects: 47,
    featured: false,
    category: '自驾',
    status: 'completed',
  },
]

