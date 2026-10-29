import { expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PointsStep from './PointsStep'
import { createDraft } from '../../../lib/planningDraft'

function setup(points: string[]) {
  const draft = { ...createDraft(), step: 'points' as const, points, selectedPois: {} }
  const update = vi.fn()
  render(<PointsStep draft={draft} update={update} onUserInput={() => {}} />)
  return { update }
}

it('列出每个点与已选摘要', () => {
  setup(['长沙','景德镇','呈坎'])
  expect(screen.getByText('长沙')).toBeInTheDocument()
  expect(screen.getAllByText(/还没选/)).toHaveLength(3)
})

it('全部点帮我定：写入各点默认经典项', async () => {
  const { update } = setup(['长沙','景德镇'])
  await userEvent.click(screen.getByRole('button', { name: /全部点帮我定/ }))
  expect(update).toHaveBeenCalledWith(expect.objectContaining({
    selectedPois: expect.objectContaining({ 长沙: expect.any(Array), 景德镇: expect.any(Array) }),
  }))
})

it('生成按钮推进到 result（未选时先补默认）', async () => {
  const { update } = setup(['长沙'])
  await userEvent.click(screen.getByRole('button', { name: /生成完整行程/ }))
  expect(update).toHaveBeenCalledWith(expect.objectContaining({ step: 'result' }))
})
