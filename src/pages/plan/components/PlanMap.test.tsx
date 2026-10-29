import { expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PlanMap from './PlanMap'

/** 5 点 + 宏村并入黟县：合并后应为 4 个城市节点 */
const GROUPED = {
  points: ['长沙', '景德镇', '黟县', '宏村', '呈坎'],
  pointGrouping: { 宏村: '黟县' },
}

it('渲染合并后的城市节点', () => {
  render(<PlanMap points={GROUPED.points} pointGrouping={GROUPED.pointGrouping} />)
  expect(screen.getByTestId('map-node-长沙')).toBeInTheDocument()
  expect(screen.getByTestId('map-node-呈坎')).toBeInTheDocument()
  // 被分组子点不单独画城市节点
  expect(screen.queryByTestId('map-node-宏村')).toBeNull()
  // 覆盖层按钮正好对应合并后的 4 个城市
  expect(screen.getAllByTestId(/^map-node-/)).toHaveLength(4)
})

it('标注本地示意', () => {
  render(<PlanMap points={['长沙']} />)
  expect(screen.getByText(/本地示意/)).toBeInTheDocument()
})

it('点击节点切换高亮并同步 aria-pressed', async () => {
  const user = userEvent.setup()
  render(<PlanMap points={GROUPED.points} pointGrouping={GROUPED.pointGrouping} />)

  const node = screen.getByTestId('map-node-黟县')
  expect(node).toHaveAttribute('aria-pressed', 'false')

  await user.click(node)
  expect(node).toHaveAttribute('aria-pressed', 'true')
  // 其余节点保持未选中
  expect(screen.getByTestId('map-node-长沙')).toHaveAttribute('aria-pressed', 'false')

  await user.click(node)
  expect(node).toHaveAttribute('aria-pressed', 'false')
})

it('键盘 Tab + Enter 可触发节点高亮', async () => {
  const user = userEvent.setup()
  render(<PlanMap points={GROUPED.points} pointGrouping={GROUPED.pointGrouping} />)

  await user.tab()
  expect(screen.getByTestId('map-node-长沙')).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(screen.getByTestId('map-node-长沙')).toHaveAttribute('aria-pressed', 'true')
})
