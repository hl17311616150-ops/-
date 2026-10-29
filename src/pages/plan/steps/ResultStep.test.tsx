import { expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ResultStep from './ResultStep'
import type { PlanningDraft } from '../../../types'
import { createDraft } from '../../../lib/planningDraft'

function setup() {
  const draft: PlanningDraft = {
    ...createDraft(),
    step: 'result',
    depart: { date: '2026-11-08', period: 'morning' },
    back: { date: '2026-11-13', period: 'evening' },
    points: ['长沙', '景德镇', '黟县', '宏村', '呈坎'],
    pointGrouping: { 宏村: '黟县' },
    selectedPois: {
      长沙: ['changsha-yuelushan'],
      景德镇: ['jdz-taoxichuan', 'jdz-guyao'],
      黟县: ['yixian-xidi'],
      宏村: ['hongcun-hongcun'],
      呈坎: ['chengkan-chengkan'],
    },
  }
  const update = vi.fn()
  render(<ResultStep draft={draft} update={update} onUserInput={() => {}} />)
  return { draft }
}

it('渲染地图、摘要与按天卡片', () => {
  setup()
  expect(screen.getByText(/本地示意/)).toBeInTheDocument()
  expect(screen.getByText(/6\s*天\s*5\s*晚/)).toBeInTheDocument()
  expect(screen.getAllByText(/Day\s*\d/).length).toBeGreaterThan(0)
})

it('保存行程：出现已保存提示', async () => {
  setup()
  await userEvent.click(screen.getByTestId('save-trip'))
  expect(screen.getByText(/行程已保存/)).toBeInTheDocument()
})

it('AI 再调整入口存在（Task 8 接入）', () => {
  setup()
  expect(screen.getByTestId('ai-adjust')).toBeInTheDocument()
})
