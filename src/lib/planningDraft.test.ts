import { describe, expect, it } from 'vitest'
import { createDraft, getDraft, saveDraft, clearDraft } from './planningDraft'

describe('规划草稿', () => {
  it('草稿存取与清空', () => {
    const d = createDraft()
    expect(d.step).toBe('time')
    saveDraft({ ...d, step: 'route', points: ['长沙','景德镇'] })
    expect(getDraft()?.step).toBe('route')
    expect(getDraft()?.points).toEqual(['长沙','景德镇'])
    clearDraft()
    expect(getDraft()).toBeNull()
  })

  it('损坏的草稿数据回退 null（Review Focus #3）', () => {
    localStorage.setItem('travel:v1:planning-draft', JSON.stringify('not-an-object'))
    expect(getDraft()).toBeNull()
    localStorage.setItem('travel:v1:planning-draft', JSON.stringify({ id: 'x' })) // 缺 step
    expect(getDraft()).toBeNull()
  })
})
