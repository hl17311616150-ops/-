import { expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PointDetail from './PointDetail'

function setup() {
  const onConfirm = vi.fn()
  const onBack = vi.fn()
  render(<PointDetail point="长沙" selectedIds={[]} onConfirm={onConfirm} onBack={onBack} />)
  return { onConfirm, onBack }
}

it('初始显示 6 条与总数，可加载更多', async () => {
  setup()
  expect(screen.getByText(/已显示\s*6/)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: /加载更多/ }))
  expect(screen.getByText(/已显示\s*12/)).toBeInTheDocument()
})

it('勾选 POI 后已选数更新，确认回写并返回列表', async () => {
  const { onConfirm, onBack } = setup()
  await userEvent.click(screen.getByText('岳麓山'))
  expect(screen.getByText(/已选\s*1/)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: '确认' }))
  expect(onConfirm).toHaveBeenCalledWith(expect.arrayContaining([expect.any(String)]))
  expect(onBack).toHaveBeenCalled()
})

it('搜索过滤结果（唯一名称）', async () => {
  setup()
  await userEvent.type(screen.getByPlaceholderText(/搜索/), '岳麓山')
  expect(screen.getByText(/已显示\s*1/)).toBeInTheDocument()
})
