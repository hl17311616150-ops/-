/**
 * 全库持久化存储 key 常量表（收拢原本散落在各 lib/页面里的字符串 key）。
 * - 统一在此登记，配合 store.ts 的 travel:v1: 命名空间拼完整 key。
 * - 值逐一锁定现状：任何 key 字符串的改动都会破坏既有 localStorage 数据，
 *   故 keys.test.ts 逐值断言防漂移（v2 上云前统一迁移点名入口）。
 */

export const K = {
  /** 当前激活行程（Home 规划/路线草稿） */
  trip: 'trip',
  /** 足迹：去过的目的地 id */
  visited: 'visited',
  /** 足迹：照片条目 */
  photos: 'photos',
  /** 足迹：已完成出行归档 */
  trips: 'trips',
  /** 足迹：回收站 */
  recycled: 'recycled',
  /** 待出行清单 */
  upcoming: 'upcoming',
  /** 板块显示顺序 */
  sectionOrder: 'section-order',
  /** 分享快照 */
  snapshots: 'snapshots',
  /** 社区：点赞/收藏互动 */
  communityInteractions: 'community-interactions',
  /** 社区：进行中（边走边发）用户帖 */
  communityOngoing: 'community-ongoing',
  /** 社区：已收尾用户帖 */
  communityCompleted: 'community-completed',
  /** 社区：评论 */
  communityComments: 'community-comments',
  /** 主题切换（经命名空间 travel:v1: 拼接） */
  theme: 'theme',
  /** 数据 schema 版本标记（迁移机制入口） */
  schemaVersion: 'schemaVersion',
  /** 准备清单动态 key 前缀 */
  prepPrefix: 'prep:',
  /** Home 视图停留（独立 gv: 语义，字符串值不变） */
  homeView: 'gv:homeView',
  /** AI 分步引导规划草稿 */
  planningDraft: 'planning-draft',
} as const

/** 准备清单 key：prep:{tripId} */
export const prepKey = (id: string) => `${K.prepPrefix}${id}`
