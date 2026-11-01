import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppRoutes } from './App'

describe('react-router 封面放射式导航骨架', () => {
  it('各路由渲染对应占位页', () => {
    render(<MemoryRouter initialEntries={['/community']}><AppRoutes /></MemoryRouter>)
    expect(screen.getByTestId('page-community')).toBeInTheDocument()
  })

  it('其余五条路由逐个渲染对应占位页', () => {
    const cases: Array<[string, string]> = [
      ['/', 'page-home'],
      ['/plan', 'page-plan'],
      ['/trip/123', 'page-trip'],
      ['/community/123', 'page-post'],
      ['/profile', 'page-profile'],
    ]
    for (const [path, testid] of cases) {
      const { unmount } = render(
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>,
      )
      expect(screen.getByTestId(testid)).toBeInTheDocument()
      unmount()
    }
  })

  it('/publish 与 /community/:id/comments 命中新页面，未知路径重定向 /', async () => {
    const first = render(<MemoryRouter initialEntries={['/publish']}><AppRoutes /></MemoryRouter>)
    expect(await screen.findByTestId('publish-page')).toBeInTheDocument()
    first.unmount()

    const second = render(<MemoryRouter initialEntries={['/community/chuanxi/comments']}><AppRoutes /></MemoryRouter>)
    expect(await screen.findByTestId('comments-page')).toBeInTheDocument()
    second.unmount()

    render(<MemoryRouter initialEntries={['/no-such-path']}><AppRoutes /></MemoryRouter>)
    expect(await screen.findByTestId('page-home')).toBeInTheDocument()
  })
})
