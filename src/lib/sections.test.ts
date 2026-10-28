import { beforeEach, describe, expect, it } from 'vitest'
import { getSectionOrder, setSectionOrder } from './sections'

beforeEach(() => {
  localStorage.clear()
})

describe('板块顺序 sections', () => {
  it('默认顺序为 首页→推荐→空间→社区', () => {
    expect(getSectionOrder()).toEqual(['home', 'recommend', 'space', 'community'])
  })

  it('setSectionOrder 持久化顺序', () => {
    setSectionOrder(['space', 'home', 'recommend'])
    expect(getSectionOrder()).toEqual(['space', 'home', 'recommend', 'community'])
  })

  it('坏数据（非数组）回退默认顺序', () => {
    localStorage.setItem('travel:v1:section-order', '{"a":1}')
    expect(getSectionOrder()).toEqual(['home', 'recommend', 'space', 'community'])
  })

  it('顺序缺少板块时自动补齐', () => {
    localStorage.setItem('travel:v1:section-order', JSON.stringify(['space']))
    const o = getSectionOrder()
    expect(o).toContain('home')
    expect(o).toContain('recommend')
    expect(o).toContain('space')
    expect(o).toContain('community')
  })

  it('community 是合法板块且可排序', () => {
    setSectionOrder(['community', 'home', 'space', 'recommend'])
    expect(getSectionOrder()).toEqual(['community', 'home', 'space', 'recommend'])
  })
})
