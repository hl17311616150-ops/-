import { expect, it } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import PostDetail from './PostDetail'
import PostCover from './components/PostCover'
import { COMMUNITY_POSTS } from '../../data/community'
import type { CommunityPost } from '../../data/community'

/** 测试夹具：为 PostDetail 的 useParams / useNavigate 提供路由上下文（本 Task 与 Task 6 共用） */
function PostDetailRoutes() {
  return (
    <Routes>
      <Route path="/community/:id" element={<PostDetail />} />
      <Route path="/community" element={<div data-testid="community-list" />} />
    </Routes>
  )
}

const noop = (): void => {}

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
  expect(screen.getByTestId('post-back-btn').style.width).toBe('36px')
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

// Fix round 1：里程为 0 时 PostCover 隐藏里程/分类段及其前置分隔符

it('PostCover 里程为 0 时不出现 0km，天数晚段保留', () => {
  const zeroKm: CommunityPost = { ...COMMUNITY_POSTS[0], id: 'zero_km', distanceKm: 0, days: 3, nights: 2 }
  render(<PostCover post={zeroKm} onBack={noop} onToggleSave={noop} saved={false} followed={false} onToggleFollow={noop} />)
  const cover = screen.getByTestId('post-cover')
  expect(cover.textContent).toContain('3天2晚')
  expect(cover.textContent).not.toContain('0km')
})

it('PostCover 种子帖里程段与分类照常显示（>0 渲染口径零变化）', () => {
  render(<PostCover post={COMMUNITY_POSTS[0]} onBack={noop} onToggleSave={noop} saved={false} followed={false} onToggleFollow={noop} />)
  expect(screen.getByTestId('post-cover').textContent).toContain(`${COMMUNITY_POSTS[0].distanceKm}km`)
})
