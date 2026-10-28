import { describe, expect, it } from 'vitest'
import { recommendByMonth } from './recommend'
import { Destinations } from '../data/destinations'

const emei = Destinations.find((d) => d.id === 'dest_emei')!

describe('本月推荐 recommendByMonth', () => {
  it('随月份变化：不同月份返回不同结果', () => {
    const may = recommendByMonth(Destinations, 5)
    const dec = recommendByMonth(Destinations, 12)
    expect(may.map((d) => d.id)).not.toEqual(dec.map((d) => d.id))
  })

  it('按 seasonMonths 筛选：某月结果都适宜该月', () => {
    const june = recommendByMonth(Destinations, 6)
    for (const d of june) {
      expect(d.seasonMonths).toContain(6)
    }
  })

  it('意图软过滤：intent 提供时，命中该类型优先', () => {
    const mount = recommendByMonth(Destinations, 10, '登山徒步')
    // 命中类型的必须在结果里
    expect(mount.map((d) => d.id)).toContain(emei.id)
  })

  it('意图为空时返回全部（非硬过滤）', () => {
    const noIntent = recommendByMonth(Destinations, 5)
    const withIntent = recommendByMonth(Destinations, 5, '美食')
    // 空意图不减少结果
    expect(noIntent.length).toBeGreaterThanOrEqual(withIntent.length)
  })

  it('月份边界不崩：12/1/2 月', () => {
    for (const m of [12, 1, 2]) {
      expect(() => recommendByMonth(Destinations, m)).not.toThrow()
    }
  })

  it('月份无匹配时返回空数组而非报错', () => {
    // 构造一个 seasonMonths 都不含 7 的假想场景：用单条目的地验证
    const onlyWinter: typeof Destinations = [
      { ...emei, id: 'winter', seasonMonths: [12, 1] },
    ]
    expect(recommendByMonth(onlyWinter, 7)).toEqual([])
  })
})
