import { expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CoverNavIcons from './CoverNavIcons'

function renderIcons() {
  return render(
    <MemoryRouter>
      <CoverNavIcons />
    </MemoryRouter>,
  )
}

it('渲染社区与我的两个入口，链接正确', () => {
  renderIcons()
  expect(screen.getByTestId('nav-community')).toHaveAttribute('href', '/community')
  expect(screen.getByTestId('nav-profile')).toHaveAttribute('href', '/profile')
})

it('热区为 44×44px，内层毛玻璃圆为 36px（jsdom 无布局引擎，以内联样式断言几何）', () => {
  renderIcons()
  for (const id of ['nav-community', 'nav-profile']) {
    const el = screen.getByTestId(id)
    expect(el.style.width).toBe('44px')
    expect(el.style.height).toBe('44px')
  }
  for (const id of ['nav-community-circle', 'nav-profile-circle']) {
    const circle = screen.getByTestId(id)
    expect(circle.style.width).toBe('36px')
    expect(circle.style.height).toBe('36px')
    expect(circle.style.backgroundColor).toBe('rgba(255, 255, 255, 0.16)')
    expect(circle.style.backdropFilter).toBe('blur(10px)')
    const icon = circle.querySelector('svg')
    expect(icon).not.toBeNull()
    expect(icon?.getAttribute('width')).toBe('18')
  }
})

it('有 aria-label 可访问', () => {
  renderIcons()
  expect(screen.getByLabelText('社区')).toBeInTheDocument()
  expect(screen.getByLabelText('我的')).toBeInTheDocument()
})
