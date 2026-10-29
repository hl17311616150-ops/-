import { expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import PlanMap from './PlanMap'

it('渲染合并后的城市节点', () => {
  render(<PlanMap points={['长沙', '景德镇', '黟县', '宏村', '呈坎']} pointGrouping={{ 宏村: '黟县' }} />)
  expect(screen.getByTestId('map-node-长沙')).toBeInTheDocument()
  expect(screen.getByTestId('map-node-呈坎')).toBeInTheDocument()
  // 被分组子点不单独画城市节点
  expect(screen.queryByTestId('map-node-宏村')).toBeNull()
})

it('标注本地示意', () => {
  render(<PlanMap points={['长沙']} />)
  expect(screen.getByText(/本地示意/)).toBeInTheDocument()
})
