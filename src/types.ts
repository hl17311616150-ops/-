/**
 * 数据模型（v1 单用户本地，但按"可上云"设计）：
 * 每条业务记录含稳定 id、时间戳、visibility（默认仅自己），
 * 社区进 v2 时可直接迁移，不必重建模型。
 */

export type Region = 'local' | 'domestic' | 'abroad'
export type Visibility = 'self'

/** 目的地（内置精选库条目） */
export interface Destination {
  id: string
  name: string
  region: Region
  location: string
  intro: string
  attractions: string[]
  /** 类型标签：登山徒步/人文风景/美食/探险/自然/城市休闲等 */
  typeTags: string[]
  /** 适宜月份（1-12），用于"本月推荐随月变化" */
  seasonMonths: number[]
  /** 气候常识（静态、离线）：各月气温区间、晴雨倾向、穿衣建议 */
  climate: {
    perMonth: Record<number, { high: number; low: number; rain: '干' | '适中' | '多雨'; clothing: string }>
  }
}

/** 行程中的一天 */
// （v1.8 起去掉"按天计划"：只保留总天数 + 总路线。按天细化排到 v2，由系统智能分析各点需要几天。）

/** 路线日记 · 时间轴一条 */
export interface DiaryEntry {
  id: string
  /** 文字内容（可为空，只有照片也算一条） */
  text: string
  /** 引用相册库照片 id（photoIds，不重复存储） */
  photoIds: string[]
  /** 此刻所在路线节点 id（出发点/途经点/目的地），可空 */
  nodeId: string | null
  createdAt: number
  updatedAt: number
}

/** 行程：总天数 + 总路线（出发点 → 途经点 → 目的地） */
export interface Trip {
  id: string
  title: string
  /** 意图标签（登山/美食/人文/探险/综合），轻量不强制 */
  intentTags: string[]
  /** 出发日期 YYYY-MM-DD；决定季节（推荐/出发前准备按其月份） */
  departDate: string | null
  /** 总天数 */
  totalDays: number
  /** 出发点（城市；模拟定位自动填、可手改，真实定位 v2） */
  startPoint: string
  /** 途经点目的地 id（按添加顺序） */
  waypoints: string[]
  /** 最终目的地 id */
  destinationId: string | null
  /** 是否已出发（进入路线页）；品牌页据此显示"继续当前行程"回路线页 */
  departed: boolean
  /** 已出发时间戳（点"出发/已完成出行"记录）；照片墙据此取"最近出行" */
  departedAt: number | null
  /** 路线日记 · 时间轴（按 createdAt 升序），归档后可继续编辑 */
  diary: DiaryEntry[]
  createdAt: number
  updatedAt: number
  visibility: Visibility
}

/** 出发前准备清单项 */
export interface ChecklistItem {
  id: string
  text: string
  checked: boolean
  /** auto=自动生成（只做参考），manual=用户手动添加 */
  source: 'auto' | 'manual'
  /** 所属准备清单（目的地 id 或行程 id） */
  prepId: string
}

/** 待出行条目：已加入待出行清单的行程快照 */
export interface UpcomingEntry {
  id: string
  /** 行程快照（加入时的完整行程） */
  trip: Trip
  addedAt: number
  /** 出发前准备清单 key（= 行程 id） */
  prepKey: string
  /** 出发前准备是否全部勾选完成（万事俱备） */
  prepDone: boolean
}

/** 照片记录（个人空间照片墙） */
export interface PhotoEntry {
  id: string
  destinationId: string
  url: string
  takenAt: number
  visibility: Visibility
}

let seq = 0
function uid(prefix: string): string {
  seq += 1
  const rand =
    typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto
      ? globalThis.crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${rand}_${seq}`
}

export function createTrip(): Trip {
  const now = Date.now()
  return {
    id: uid('trip'),
    title: '',
    intentTags: [],
    departDate: null,
    totalDays: 1,
    startPoint: '',
    waypoints: [],
    destinationId: null,
    departed: false,
    departedAt: null,
    diary: [],
    createdAt: now,
    updatedAt: now,
    visibility: 'self',
  }
}

export function createDiaryEntry(): DiaryEntry {
  const now = Date.now()
  return {
    id: uid('diary'),
    text: '',
    photoIds: [],
    nodeId: null,
    createdAt: now,
    updatedAt: now,
  }
}

export function createChecklistItem(text: string, prepId: string): ChecklistItem {
  return { id: uid('ck'), text, checked: false, source: 'auto', prepId }
}

export function createUpcomingEntry(trip: Trip): UpcomingEntry {
  return { id: uid('up'), trip, addedAt: Date.now(), prepKey: trip.id, prepDone: false }
}

export function createPhotoEntry(destinationId: string, url: string): PhotoEntry {
  return { id: uid('photo'), destinationId, url, takenAt: Date.now(), visibility: 'self' }
}
