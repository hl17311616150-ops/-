import { beforeEach, describe, expect, it } from 'vitest'
import { load, loadArray, save } from './store'

const KEY = 'trip'

beforeEach(() => {
  localStorage.clear()
})

describe('本地存储层 store', () => {
  it('save→load 回环相等', () => {
    const value = { id: 'x', visibility: 'self', createdAt: 1 }
    save(KEY, value)
    expect(load(KEY, null)).toEqual(value)
  })

  it('键使用命名空间前缀 travel:v1', () => {
    save(KEY, { a: 1 })
    const all = { ...localStorage }
    const keys = Object.keys(all)
    expect(keys.some((k) => k.startsWith('travel:v1:'))).toBe(true)
  })

  it('损坏的 JSON 字符串时 load 返回 fallback 而非抛错', () => {
    localStorage.setItem(`travel:v1:${KEY}`, '{ not valid json !!')
    expect(load(KEY, 'fallback')).toBe('fallback')
  })

  it('空值/缺字段时返回 fallback 而不崩溃', () => {
    localStorage.setItem(`travel:v1:${KEY}`, 'null')
    expect(load(KEY, { empty: true })).toEqual({ empty: true })
  })

  it('未存储的键返回 fallback', () => {
    expect(load('nothing', [])).toEqual([])
  })
})

describe('store 形状容错（Review Focus #3：损坏/旧数据不崩溃）', () => {
  it('loadArray: 合法 JSON 但形状是对象时返回 fallback 而非白屏', () => {
    localStorage.setItem(`travel:v1:${KEY}`, JSON.stringify({ not: 'array' }))
    expect(loadArray(KEY, (x): x is number => typeof x === 'number', [9])).toEqual([9])
  })

  it('loadArray: 数组内混入坏条目被过滤', () => {
    localStorage.setItem(`travel:v1:${KEY}`, JSON.stringify([1, 'bad', null, 2]))
    expect(loadArray(KEY, (x): x is number => typeof x === 'number', [])).toEqual([1, 2])
  })

  it('loadArray: 合法数组原样返回', () => {
    localStorage.setItem(`travel:v1:${KEY}`, JSON.stringify([1, 2]))
    expect(loadArray(KEY, (x): x is number => typeof x === 'number', [])).toEqual([1, 2])
  })

  it('load: getItem 抛错（受限环境/隐私模式）时返回 fallback 而非崩溃', () => {
    const orig = Storage.prototype.getItem
    Storage.prototype.getItem = function () {
      throw new DOMException('denied', 'SecurityError')
    }
    try {
      expect(load(KEY, 'fb')).toBe('fb')
    } finally {
      Storage.prototype.getItem = orig
    }
  })

  it('save: 写入失败返回 false（不再静默吞错）', () => {
    const orig = Storage.prototype.setItem
    Storage.prototype.setItem = function () {
      throw new Error('quota exceeded')
    }
    try {
      expect(save(KEY, { a: 1 })).toBe(false)
    } finally {
      Storage.prototype.setItem = orig
    }
  })

  it('save: 正常写入返回 true', () => {
    expect(save(KEY, { a: 1 })).toBe(true)
  })
})
