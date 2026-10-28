import { describe, expect, it } from 'vitest'
import { K, prepKey } from './keys'

describe('keys 常量表（收拢全库存储 key，值锁定现状防漂移）', () => {
  it('行程/足迹/待出行 key 值不变', () => {
    expect(K.trip).toBe('trip')
    expect(K.visited).toBe('visited')
    expect(K.photos).toBe('photos')
    expect(K.trips).toBe('trips')
    expect(K.recycled).toBe('recycled')
    expect(K.upcoming).toBe('upcoming')
  })

  it('板块/快照/社区/主题 key 值不变', () => {
    expect(K.sectionOrder).toBe('section-order')
    expect(K.snapshots).toBe('snapshots')
    expect(K.communityInteractions).toBe('community-interactions')
    expect(K.communityOngoing).toBe('community-ongoing')
    expect(K.communityCompleted).toBe('community-completed')
    expect(K.communityComments).toBe('community-comments')
    expect(K.theme).toBe('theme')
    expect(K.homeView).toBe('gv:homeView')
  })

  it('动态 key 工厂 prepKey 拼出 prep:{id}', () => {
    expect(prepKey('t1')).toBe('prep:t1')
  })

  it('theme 经命名空间拼接后等于既有完整 key travel:v1:theme', () => {
    // store.ts 用 travel:v1: 前缀包 K.theme，必须还原出旧 theme.tsx 的硬编码 key
    expect(`travel:v1:${K.theme}`).toBe('travel:v1:theme')
  })
})
