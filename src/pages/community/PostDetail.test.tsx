import { expect, it } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import PostDetail from './PostDetail'
import { COMMUNITY_POSTS } from '../../data/community'

/** 测试夹具：为 PostDetail 的 useParams / useNavigate 提供路由上下文（本 Task 与 Task 6 共用） */
function PostDetailRoutes() {
  return (
    <Routes>
      <Route path="/community/:id" element={<PostDetail />} />
      <Route path="/community" element={<div data-testid="community-list" />} />
    </Routes>
  )
}

// 未知 id 兜底
it('未知 id 显示兜底与返回，不白屏', async () => {
  render(<MemoryRouter initialEntries={['/community/不存在']}><PostDetailRoutes /></MemoryRouter>)
  expect(await screen.findByTestId('post-not-found')).toBeInTheDocument()
  fireEvent.click(screen.getByTestId('post-not-found-back'))
})

// 正常详情（值来自 community-detail-dark.html）
it('封面高 300、标题 24px 衬线、毛玻璃圆 36；路线卡圆角 15；日记图 64 圆角 9', async () => {
  render(<MemoryRouter initialEntries={['/community/chuanxi']}><PostDetailRoutes /></MemoryRouter>)
  await waitFor(() => expect(screen.getByTestId('post-cover')).toBeInTheDocument())
  expect(screen.getByTestId('post-cover').style.height).toBe('300px')
  expect(screen.getByTestId('post-title').style.fontSize).toBe('24px')
  expect(screen.getAllByTestId('post-cover-circle')[0].style.width).toBe('36px')
  expect(screen.getByTestId('post-route-card').style.borderRadius).toBe('15px')
  const dimg = screen.getAllByTestId('post-diary-img')[0]
  expect(dimg.style.width).toBe('64px'); expect(dimg.style.borderRadius).toBe('9px')
})

it('日记/照片 Tab 可切换，照片 Tab 复用网格且单元格数=照片总数', async () => {
  render(<MemoryRouter initialEntries={['/community/chuanxi']}><PostDetailRoutes /></MemoryRouter>)
  await waitFor(() => expect(screen.getByTestId('post-cover')).toBeInTheDocument())
  fireEvent.click(screen.getByTestId('post-tab-photos'))
  const expected = COMMUNITY_POSTS.find((p) => p.id === 'chuanxi')!.entries.flatMap((e) => e.photoIds).length
  expect(await screen.findAllByTestId(/^grid-cell-/)).toHaveLength(expected)
})
