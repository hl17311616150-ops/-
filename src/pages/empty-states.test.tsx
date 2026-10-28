import { beforeEach, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from './Home'
import Space from './Space'

beforeEach(() => {
  localStorage.clear()
})

// 空态是 PRD 5.1 与开发计划 Review Focus 点名的重点风险面（I-8）

test('Home 无行程：整页品牌区，显示"开始规划行程"引导', () => {
  render(<Home />)
  expect(screen.getByRole('button', { name: /开始规划行程/ })).toBeInTheDocument()
  expect(screen.getByText(/挑个想去的地方/)).toBeInTheDocument()
  // 品牌引导按钮可见（折叠动画容器不参与：编辑器隐藏时其内部文本仍在 DOM）
})

test('Space 全空：主页三个独立入口（足迹/照片/主题）都在', () => {
  render(
    <MemoryRouter>
      <Space />
    </MemoryRouter>,
  )
  expect(screen.getByText('走过的足迹')).toBeInTheDocument()
  expect(screen.getByText('照片墙')).toBeInTheDocument()
  expect(screen.getByText('主题', { exact: true })).toBeInTheDocument()
})
