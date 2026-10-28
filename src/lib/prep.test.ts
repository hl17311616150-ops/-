import { describe, expect, it } from 'vitest'
import { generatePrep } from './prep'
import { Destinations } from '../data/destinations'

const emei = Destinations.find((d) => d.id === 'dest_emei')!
// 峨眉山 4 月气候：clothing = "夹克，山上更冷"

describe('出发前准备 generatePrep', () => {
  it('意图为空时只按气候生成，不含意图专属物品', () => {
    const items = generatePrep(emei, 4, undefined)
    const texts = items.map((i) => i.text)
    expect(texts.some((t) => t.includes('夹克'))).toBe(true)
    expect(texts.some((t) => t.includes('登山杖'))).toBe(false)
  })

  it('登山意图产生专属物品（登山杖/防滑/保暖/应急）', () => {
    const items = generatePrep(emei, 4, '登山徒步')
    const texts = items.map((i) => i.text)
    expect(texts.some((t) => t.includes('登山杖'))).toBe(true)
    expect(texts.some((t) => t.includes('防滑'))).toBe(true)
    expect(texts.some((t) => t.includes('保暖'))).toBe(true)
    expect(texts.some((t) => t.includes('应急'))).toBe(true)
  })

  it('美食意图产生肠胃药等专属物品', () => {
    const chengdu = Destinations.find((d) => d.id === 'dest_chengdu')!
    const items = generatePrep(chengdu, 5, '美食')
    const texts = items.map((i) => i.text)
    expect(texts.some((t) => t.includes('肠胃药'))).toBe(true)
  })

  it('同输入可复现（确定性）', () => {
    const a = generatePrep(emei, 4, '登山徒步').map((i) => i.text)
    const b = generatePrep(emei, 4, '登山徒步').map((i) => i.text)
    expect(a).toEqual(b)
  })

  it('全部为 source:"auto"，未勾选', () => {
    const items = generatePrep(emei, 4, '登山徒步')
    for (const i of items) {
      expect(i.source).toBe('auto')
      expect(i.checked).toBe(false)
    }
  })
})
