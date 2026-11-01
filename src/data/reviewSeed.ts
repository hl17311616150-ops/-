import chuanxiImg from '../assets/home/card-chuanxi.jpg'
import dianxibeiImg from '../assets/home/card-dianxibei.jpg'
import wannanImg from '../assets/home/card-wannan.jpg'
import qingganImg from '../assets/home/card-qinggan.jpg'
import hainanImg from '../assets/home/card-hainan.jpg'
import dongbeiImg from '../assets/home/card-dongbei.jpg'

/** 种子照片总数（8 条日记 6/4/0/5/7/4/8/4 = 38） */
export const SEED_PHOTO_TOTAL = 38

/** 种子日记条目规格：纯数据，不含运行时引用 */
export interface SeedDiarySpec {
  id: string
  poiId: string | null
  text: string
  photoCount: number
  day: number
  hour: number
  minute: number
}

export const SEED_DIARIES: readonly SeedDiarySpec[] = [
  { id: 'seed_d1', poiId: 'hongcun-hongcun', text: '清晨的月沼没有游客，白墙黛瓦倒映在水里，像一幅水墨画。', photoCount: 6, day: 8, hour: 7, minute: 20 },
  { id: 'seed_d2', poiId: 'hongcun-qishuhu', text: '奇墅湖边的晨雾还没散，湖面安静得像镜子。', photoCount: 4, day: 8, hour: 16, minute: 0 },
  { id: 'seed_d3', poiId: 'hongcun-hongcun', text: '夜里在客栈听着虫鸣整理照片，皖南的秋天太舒服了。', photoCount: 0, day: 9, hour: 21, minute: 10 },
  { id: 'seed_d4', poiId: 'yixian-tachuan', text: '塔川的乌桕树开始红了，层林尽染。', photoCount: 5, day: 9, hour: 15, minute: 20 },
  { id: 'seed_d5', poiId: 'yixian-xidi', text: '西递的牌坊很有气势，村里的木雕值得细看。', photoCount: 7, day: 10, hour: 9, minute: 30 },
  { id: 'seed_d6', poiId: 'yixian-nanping', text: '南屏的巷子像迷宫，走着走着就迷了路。', photoCount: 4, day: 10, hour: 16, minute: 30 },
  { id: 'seed_d7', poiId: 'chengkan-chengkan', text: '呈坎按八卦布局，宝纶阁的木雕极为精美。', photoCount: 8, day: 11, hour: 9, minute: 0 },
  { id: 'seed_d8', poiId: 'chengkan-baolunge', text: '宝纶阁里光线昏暗，却掩不住雕梁画栋的讲究。', photoCount: 4, day: 11, hour: 15, minute: 40 },
]

/** 全局照片序号（1–38）→ 稳定种子照片 id：seed_photo_01 … seed_photo_38 */
export function seedPhotoId(ordinal: number): string {
  return `seed_photo_${String(ordinal).padStart(2, '0')}`
}

/** 6 张内置封面图循环复用：按下标 (ordinal - 1) % 6 取图 */
const SEED_PHOTO_IMAGES: readonly string[] = [
  chuanxiImg,
  dianxibeiImg,
  wannanImg,
  qingganImg,
  hainanImg,
  dongbeiImg,
]

export function seedPhotoUrl(ordinal: number): string {
  return SEED_PHOTO_IMAGES[(ordinal - 1) % SEED_PHOTO_IMAGES.length]
}
