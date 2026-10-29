import { describe, expect, it } from 'vitest'
import { VERSES, verseForDate } from './verses'

describe('诗句库', () => {
  it('内置至少 15 句，且每条有完整诗句与作者', () => {
    expect(VERSES.length).toBeGreaterThanOrEqual(15)
    for (const v of VERSES) {
      expect(v.text.length).toBeGreaterThan(0)
      expect(v.author.length).toBeGreaterThan(0)
    }
  })

  it('诗句不重复', () => {
    const texts = VERSES.map((v) => v.text)
    expect(new Set(texts).size).toBe(texts.length)
  })
})

describe('verseForDate', () => {
  it('同一天固定返回同一句', () => {
    const d = new Date(2026, 9, 28)
    expect(verseForDate(d)).toEqual(verseForDate(new Date(2026, 9, 28)))
  })

  it('给定日期返回预期下标句（确定性，非随机）', () => {
    const d = new Date(2026, 9, 28)
    const key = '2026-10-28'
    let h = 0
    for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) >>> 0
    expect(verseForDate(d)).toEqual(VERSES[h % VERSES.length])
  })

  it('不同日期可得到不同句', () => {
    const a = verseForDate(new Date(2026, 9, 28))
    const b = verseForDate(new Date(2026, 9, 29))
    // 不强制一定不同（hash 可能碰撞），但这两个 key 在 20 句下应不同
    expect(a).not.toEqual(b)
  })
})
