import { describe, expect, it } from 'vitest'
import { buildPhotoStream } from './photoStream'
import type { DiaryEntry } from '../../types'

function entry(id: string, photoIds: string[]): DiaryEntry {
  return { id, text: '', photoIds, nodeId: null, createdAt: 1, updatedAt: 1 }
}

describe('buildPhotoStream', () => {
  it('按条目顺序展开 photoIds，每项带 entry 与下标', () => {
    const e1 = entry('d1', ['p1', 'p2'])
    const e2 = entry('d2', ['p3'])
    const stream = buildPhotoStream([e1, e2])
    expect(stream.map((s) => s.photoId)).toEqual(['p1', 'p2', 'p3'])
    expect(stream[0]).toMatchObject({ entryIndex: 0, photoIndexInEntry: 0 })
    expect(stream[2]).toMatchObject({ entryIndex: 1, photoIndexInEntry: 0 })
  })

  it('同一条目多图共享同一个 entry 引用（Review Focus #3）', () => {
    const e1 = entry('d1', ['p1', 'p2'])
    const stream = buildPhotoStream([e1])
    expect(stream[0].entry).toBe(e1)
    expect(stream[1].entry).toBe(e1)
  })

  it('纯文字条目（photoIds 为空）不产生项（Review Focus #2）', () => {
    const stream = buildPhotoStream([entry('d1', []), entry('d2', ['p9'])])
    expect(stream.map((s) => s.photoId)).toEqual(['p9'])
    expect(stream[0].entryIndex).toBe(1)
  })

  it('空条目列表返回空数组', () => {
    expect(buildPhotoStream([])).toEqual([])
  })
})
