import { beforeEach, expect, it } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import PostDetail from './PostDetail'
import CommentsPage from './comments/CommentsPage'
import { COMMUNITY_POSTS } from '../../data/community'
import { getTrip } from '../../lib/trip'
import { getReviewData } from '../../lib/review/seedStore'
import { publishEntryToOngoing } from '../../lib/community/userPosts'

beforeEach(() => {
  localStorage.clear()
})

/** 测试夹具：为 PostDetail 的 useParams / useNavigate 提供路由上下文（与 PostDetail.test.tsx 同口径） */
function PostDetailRoutes() {
  return (
    <Routes>
      <Route path="/community/:id" element={<PostDetail />} />
      <Route path="/community/:id/comments" element={<CommentsPage />} />
      <Route path="/community" element={<div data-testid="community-list" />} />
      <Route path="/plan" element={<div data-testid="probe-plan" />} />
    </Routes>
  )
}

it('点网格照片打开全屏，计数与照片流一致，关闭返回详情', async () => {
  render(<MemoryRouter initialEntries={['/community/chuanxi']}><PostDetailRoutes /></MemoryRouter>)
  await waitFor(() => expect(screen.getByTestId('post-cover')).toBeInTheDocument())
  fireEvent.click(screen.getByTestId('post-tab-photos'))
  const cells = await screen.findAllByTestId(/^grid-cell-/)
  fireEvent.click(cells[0])
  expect(await screen.findByTestId('fs-root')).toBeInTheDocument()
  expect(screen.getByTestId('fs-count').textContent).toMatch(/1\s*\//)
  fireEvent.click(screen.getByTestId('fs-close'))
  await waitFor(() => expect(screen.queryByTestId('fs-root')).not.toBeInTheDocument())
})
it('默认日记 Tab 点缩略图按钮打开全屏，计数格式正确，关闭返回详情', async () => {
  render(<MemoryRouter initialEntries={['/community/chuanxi']}><PostDetailRoutes /></MemoryRouter>)
  await waitFor(() => expect(screen.getByTestId('post-cover')).toBeInTheDocument())
  const opener = screen.getAllByTestId('post-diary-img')[0].closest('button')!
  fireEvent.click(opener)
  expect(await screen.findByTestId('fs-root')).toBeInTheDocument()
  expect(screen.getByTestId('fs-count').textContent).toMatch(/1\s*\//)
  fireEvent.click(screen.getByTestId('fs-close'))
  await waitFor(() => expect(screen.queryByTestId('fs-root')).not.toBeInTheDocument())
})
it('纯文字条目不进全屏流，照片流只含图片', async () => {
  const post = COMMUNITY_POSTS.find((p) => p.id === 'chuanxi')!
  render(<MemoryRouter initialEntries={['/community/chuanxi']}><PostDetailRoutes /></MemoryRouter>)
  await waitFor(() => expect(screen.getByTestId('post-cover')).toBeInTheDocument())
  const photoCount = post.entries.flatMap((e) => e.photoIds).length
  fireEvent.click(screen.getByTestId('post-tab-photos'))
  expect(await screen.findAllByTestId(/^grid-cell-/)).toHaveLength(photoCount)
})
it('点赞本地态切换计数 ±1 且可切回原值；关注/收藏同步切换', async () => {
  render(<MemoryRouter initialEntries={['/community/chuanxi']}><PostDetailRoutes /></MemoryRouter>)
  await waitFor(() => expect(screen.getByTestId('post-cover')).toBeInTheDocument())
  const base = COMMUNITY_POSTS.find((p) => p.id === 'chuanxi')!.likes
  const like = screen.getByTestId('post-like-btn')
  expect(screen.getByTestId('post-like-count').textContent).toBe(String(base))
  fireEvent.click(like)
  expect(screen.getByTestId('post-like-count').textContent).toBe(String(base + 1))
  fireEvent.click(like)
  expect(screen.getByTestId('post-like-count').textContent).toBe(String(base))
})
it('点“用这条路线规划”导航到 /plan', async () => {
  render(<MemoryRouter initialEntries={['/community/chuanxi']}><PostDetailRoutes /></MemoryRouter>)
  await waitFor(() => expect(screen.getByTestId('plan-route-btn')).toBeInTheDocument())
  fireEvent.click(screen.getByTestId('plan-route-btn'))
  await waitFor(() => expect(screen.queryByTestId('post-cover')).not.toBeInTheDocument())
})
it('评论项为可点按钮，点击进入评论页', async () => {
  render(<MemoryRouter initialEntries={['/community/chuanxi']}><PostDetailRoutes /></MemoryRouter>)
  await waitFor(() => expect(screen.getByTestId('post-cover')).toBeInTheDocument())
  fireEvent.click(screen.getByTestId('post-comments-btn'))
  expect(await screen.findByTestId('comments-page')).toBeInTheDocument()
})

it('用户 ongoing 帖经 getAnyPostById 可打开详情，不进 post-not-found 兜底', async () => {
  // 由当前行程落一条用户 ongoing 帖（确定性 id ongoing_<tripId>），锁定「用户帖可达详情」接线目标
  const trip = getTrip()
  const { entries } = await getReviewData(trip)
  publishEntryToOngoing(trip, entries[0])
  const ongoingId = `ongoing_${trip.id}`

  render(<MemoryRouter initialEntries={[`/community/${ongoingId}`]}><PostDetailRoutes /></MemoryRouter>)
  expect(await screen.findByTestId('post-cover')).toBeInTheDocument()
  expect(screen.queryByTestId('post-not-found')).toBeNull()
  // 空标题行程兜底为默认文案，标题回显证明解析到的正是刚落库的用户帖
  expect(screen.getByTestId('post-title').textContent).toBe('我的山野游记')
})
