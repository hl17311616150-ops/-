import { expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HomeCover from './HomeCover'

function renderCover() {
  return render(
    <MemoryRouter>
      <HomeCover />
    </MemoryRouter>,
  )
}

it('渲染品牌与 slogan', () => {
  renderCover()
  expect(screen.getByTestId('page-home')).toBeInTheDocument()
  expect(screen.getByText('归野')).toBeInTheDocument()
  expect(screen.getByText('归山野，')).toBeInTheDocument()
  expect(screen.getByText('见自己')).toBeInTheDocument()
})

it('包含每日诗句、功能说明、主按钮、热门卡片栈', () => {
  renderCover()
  expect(screen.getByTestId('daily-verse')).toBeInTheDocument()
  expect(screen.getByText(/AI 行程规划师/)).toBeInTheDocument()
  expect(screen.getByTestId('home-main-button')).toBeInTheDocument()
  expect(screen.getByText('今日热门线路')).toBeInTheDocument()
  expect(screen.getByTestId('hot-card-chuanxi')).toBeInTheDocument()
})

it('包含右上角社区/我的入口', () => {
  renderCover()
  expect(screen.getByTestId('nav-community')).toBeInTheDocument()
  expect(screen.getByTestId('nav-profile')).toBeInTheDocument()
})
