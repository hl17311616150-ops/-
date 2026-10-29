import { expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SuggestionList from './SuggestionList'
import { buildPlan } from '../../../lib/plan/buildPlan'
import type { PlanningDraft } from '../../../types'
import { createDraft } from '../../../lib/planningDraft'

function setup() {
  const draft: PlanningDraft = {
    ...createDraft(),
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
  const days = buildPlan(draft)
  const onApply = vi.fn()
  render(<SuggestionList days={days} draft={draft} onApply={onApply} onBack={() => {}} />)
  return { onApply, days }
}

it('列出建议并可单条采纳', async () => {
  setup()
  const adopt = screen.getAllByRole('button', { name: '采纳' })
  expect(adopt.length).toBeGreaterThan(0)
  await userEvent.click(adopt[0])
  // 采纳后该条变为已采纳态
  expect(screen.getAllByText(/已采纳/).length).toBeGreaterThan(0)
})

it('全部采纳并重新生成：onApply 收到新行程', async () => {
  const { onApply } = setup()
  await userEvent.click(screen.getByTestId('apply-all'))
  expect(onApply).toHaveBeenCalled()
})
