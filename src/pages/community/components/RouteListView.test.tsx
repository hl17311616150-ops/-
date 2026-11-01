import { expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RouteListView from './RouteListView'
import { COMMUNITY_POSTS } from '../../../data/community'

it('渲染每个路线行：缩略图 54、行圆角 14、绿色圆按钮 34', () => {
  render(<RouteListView posts={COMMUNITY_POSTS} onOpenPost={vi.fn()} onUse={vi.fn()} />)
  const rows = screen.getAllByTestId('route-row')
  expect(rows).toHaveLength(COMMUNITY_POSTS.length)
  expect(rows[0].querySelector('img')?.style.width).toBe('54px')
  expect(rows[0].style.borderRadius).toBe('14px')
  expect(screen.getAllByTestId('route-use-btn')[0].style.width).toBe('34px')
  expect(screen.getAllByTestId('route-use-btn')[0].style.backgroundColor).toBe('rgb(111, 168, 121)')
})
it('排序/难度 select 改变后列表更新；use 按钮触发 onUse', () => {
  const onUse = vi.fn()
  render(<RouteListView posts={COMMUNITY_POSTS} onOpenPost={vi.fn()} onUse={onUse} />)
  // 难度选「挑战」后只剩挑战条目
  const diffSelect = screen.getByLabelText('难度')
  fireEvent.change(diffSelect, { target: { value: '挑战' } })
  expect(screen.getAllByTestId('route-row').every((r) => r.textContent?.includes('挑战'))).toBe(true)
  fireEvent.click(screen.getAllByTestId('route-use-btn')[0])
  expect(onUse).toHaveBeenCalled()
})
