import { expect, it, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ResultStep from './ResultStep'
import type { PlanningDraft, Trip } from '../../../types'
import { createDraft } from '../../../lib/planningDraft'
import { load } from '../../../storage/store'
import { K } from '../../../storage/keys'

beforeEach(() => {
  localStorage.clear()
})

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

it('逐天 cityLabel 对齐：三个跨城标签按分配出现（Review I3）', () => {
  setup()
  expect(screen.getByText('长沙 → 景德镇')).toBeInTheDocument()
  expect(screen.getByText('景德镇 → 黟县')).toBeInTheDocument()
  expect(screen.getByText('黟县 → 呈坎')).toBeInTheDocument()
})

it('换住宿：展开首日候选并选中岳麓山·麓山民宿，卡片住宿名更新（Review I3）', async () => {
  setup()
  const firstCard = screen.getByText('Day1').closest('section') as HTMLElement
  await userEvent.click(within(firstCard).getByTestId('swap-0'))
  await userEvent.click(within(firstCard).getByText('岳麓山·麓山民宿'))
  expect(within(firstCard).getByText('岳麓山·麓山民宿')).toBeInTheDocument()
})

it('全部采纳建议后保存，K.trip 景德镇首晚落 stay-jd-2（Review I3）', async () => {
  setup()
  await userEvent.click(screen.getByTestId('ai-adjust'))
  expect(screen.getByTestId('apply-all')).toBeInTheDocument()
  await userEvent.click(screen.getByTestId('apply-all'))
  // 采纳完成：建议面板关闭、days 更新
  expect(screen.queryByTestId('apply-all')).toBeNull()
  await userEvent.click(screen.getByTestId('save-trip'))

  const trip = load<Trip | null>(K.trip, null)
  expect(trip?.dayPlans).toHaveLength(6)
  // 全部采纳后景德镇首晚（dayPlans[1]）被换成景区内 stay-jd-2
  expect(trip?.dayPlans?.[1].stay?.stayId).toBe('stay-jd-2')
})
