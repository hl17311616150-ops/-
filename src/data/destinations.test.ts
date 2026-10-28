import { describe, expect, it } from 'vitest'
import { Destinations } from './destinations'

describe('内置目的地库', () => {
  it('规模 ≥ 30 个目的地', () => {
    expect(Destinations.length).toBeGreaterThanOrEqual(30)
  })

  it('每条目的地字段完整：id/name/typeTags/seasonMonths/climate', () => {
    for (const d of Destinations) {
      expect(typeof d.id).toBe('string')
      expect(typeof d.name).toBe('string')
      expect(d.name.length).toBeGreaterThan(0)
      expect(Array.isArray(d.typeTags)).toBe(true)
      expect(d.typeTags.length).toBeGreaterThan(0)
      expect(Array.isArray(d.seasonMonths)).toBe(true)
      expect(d.seasonMonths.length).toBeGreaterThan(0)
      expect(d.climate?.perMonth).toBeTruthy()
    }
  })

  it('id 全局唯一', () => {
    const ids = new Set(Destinations.map((d) => d.id))
    expect(ids.size).toBe(Destinations.length)
  })

  it('覆盖本地（四川/广安）目的地', () => {
    const local = Destinations.filter((d) => d.region === 'local')
    expect(local.length).toBeGreaterThanOrEqual(1)
  })

  it('覆盖国内与国外目的地', () => {
    const domestic = Destinations.filter((d) => d.region === 'domestic')
    const abroad = Destinations.filter((d) => d.region === 'abroad')
    expect(domestic.length).toBeGreaterThanOrEqual(1)
    expect(abroad.length).toBeGreaterThanOrEqual(1)
  })

  it('类型标签覆盖登山/美食/人文/探险等意图', () => {
    const allTypes = new Set(Destinations.flatMap((d) => d.typeTags))
    expect(allTypes.has('登山徒步')).toBe(true)
    expect(allTypes.has('美食')).toBe(true)
    expect(allTypes.has('人文风景')).toBe(true)
    expect(allTypes.has('探险')).toBe(true)
  })

  it('气候常识覆盖 1-12 月且含气温/晴雨/穿衣', () => {
    for (const d of Destinations) {
      for (const m of d.seasonMonths) {
        const c = d.climate.perMonth[m]
        expect(c).toBeTruthy()
        expect(typeof c.high).toBe('number')
        expect(typeof c.low).toBe('number')
        expect(['干', '适中', '多雨']).toContain(c.rain)
        expect(c.clothing.length).toBeGreaterThan(0)
      }
    }
  })
})
