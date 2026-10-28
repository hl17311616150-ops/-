import { beforeEach, describe, expect, it } from 'vitest'
import type { ChecklistItem } from '../types'
import {
  addManual,
  getPrepList,
  initAuto,
  removeItem,
  savePrepList,
  toggleItem,
} from './prepStore'

const item = (id: string, text: string, source: ChecklistItem['source'] = 'auto'): ChecklistItem => ({
  id,
  text,
  checked: false,
  source,
  prepId: 'trip1',
})

beforeEach(() => {
  localStorage.clear()
})

describe('出发前准备 prepStore', () => {
  it('初始清单为空', () => {
    expect(getPrepList('trip1')).toEqual([])
  })

  it('save→load 回环保持', () => {
    const items = [item('a', '带伞')]
    savePrepList('trip1', items)
    expect(getPrepList('trip1')).toEqual(items)
  })

  it('initAuto 仅注入 source:auto 项', () => {
    const items = [item('1', '登山杖'), item('2', '肠胃药')]
    initAuto('trip1', items)
    const got = getPrepList('trip1')
    expect(got.length).toBe(2)
    expect(got.every((i) => i.source === 'auto')).toBe(true)
  })

  it('addManual 添加 source:manual 项', () => {
    initAuto('trip1', [item('1', 'a')])
    addManual('trip1', '记得带身份证')
    const got = getPrepList('trip1')
    expect(got.some((i) => i.source === 'manual' && i.text === '记得带身份证')).toBe(true)
  })

  it('toggleItem 翻转 checked 并持久化', () => {
    initAuto('trip1', [item('1', 'a')])
    toggleItem('trip1', '1')
    expect(getPrepList('trip1').find((i) => i.id === '1')!.checked).toBe(true)
    toggleItem('trip1', '1')
    expect(getPrepList('trip1').find((i) => i.id === '1')!.checked).toBe(false)
  })

  it('removeItem 删除指定项', () => {
    initAuto('trip1', [item('1', 'a')])
    removeItem('trip1', '1')
    expect(getPrepList('trip1')).toEqual([])
  })
})
