import { describe, expect, it } from 'vitest'
import { dragReorder } from './drag'

describe('拖拽排序 drag', () => {
  it('dragReorder 把 from 移到 to，其余顺移', () => {
    expect(dragReorder(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(dragReorder(['a', 'b', 'c', 'd'], 3, 0)).toEqual(['d', 'a', 'b', 'c'])
    expect(dragReorder(['a', 'b', 'c'], 1, 0)).toEqual(['b', 'a', 'c'])
  })

  it('from 等于 to 或越界时原样返回', () => {
    expect(dragReorder(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c'])
    expect(dragReorder(['a', 'b', 'c'], -1, 2)).toEqual(['a', 'b', 'c'])
    expect(dragReorder(['a', 'b', 'c'], 0, 9)).toEqual(['a', 'b', 'c'])
  })
})
