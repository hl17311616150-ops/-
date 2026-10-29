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

it('空路线时按钮禁用，并提示先在上一步确定路线', () => {
  setup([])
  expect(screen.getByText(/先在上一步确定路线/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /全部点帮我定/ })).toBeDisabled()
  expect(screen.getByRole('button', { name: /生成完整行程/ })).toBeDisabled()
})

it('无收录库的点显示暂未收录，批量补默认不写入空数组', async () => {
  const { update } = setup(['长沙', '自贡'])
  expect(screen.getByText(/暂未收录/)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /全部点帮我定/ }))
  const arg = update.mock.calls[0][0] as { selectedPois: Record<string, string[]> }
  expect(arg.selectedPois).toHaveProperty('长沙')
  expect(arg.selectedPois).not.toHaveProperty('自贡')
})

it('无收录库的点行禁用，无法进入空详情，暂未收录提示仍可见', () => {
  setup(['长沙', '自贡'])
  const disabledRow = screen.getByRole('button', { name: /自贡/ })
  expect(disabledRow).toBeDisabled()
  expect(screen.getByText(/暂未收录/)).toBeInTheDocument()
})
