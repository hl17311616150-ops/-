import { beforeEach, expect, it } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import CommentsPage from './CommentsPage'

/**
 * 评论区页测试（Plan 7 · Task 5 · Step 1）。
 * 本地 Routes 注册 /community/:id/comments → CommentsPage，使 useParams 取到 id；
 * /community 占位 div 供返回按钮导航断言。jsdom 中 localStorage 跨用例共享，beforeEach 清空。
 */
function CommentsRoutes() {
  return (
    <Routes>
      <Route path="/community/:id/comments" element={<CommentsPage />} />
      <Route path="/community" element={<div data-testid="community-list" />} />
    </Routes>
  )
}

function mount(id = 'chuanxi') {
  return render(
    <MemoryRouter initialEntries={[`/community/${id}/comments`]}>
      <CommentsRoutes />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
})

it('头部返回圆 32、标题 15px 含计数；排序 11.5px，最新切为选中', async () => {
  mount()
  expect((await screen.findByTestId('comments-back')).style.width).toBe('32px')
  expect(screen.getByTestId('comments-title').style.fontSize).toBe('15px')
  const sorts = screen.getAllByTestId('sort-option')
  fireEvent.click(sorts[1])
  expect(sorts[1].getAttribute('aria-pressed')).toBe('true')
})

it('评论头像 34、昵称 12.5、作者标 9.5px、正文 13px 行高1.6、点赞 11px', async () => {
  mount()
  const av = await screen.findAllByTestId('comment-avatar')
  expect(av[0].style.width).toBe('34px')
  expect(screen.getAllByTestId('comment-name')[0].style.fontSize).toBe('12.5px')
  const badge = screen.getAllByTestId('author-badge')[0]
  expect(badge.style.fontSize).toBe('9.5px')
  expect(screen.getAllByTestId('comment-text')[0].style.fontSize).toBe('13px')
  fireEvent.click(screen.getAllByTestId('comment-like')[0])
  expect(screen.getAllByTestId('comment-like')[0].getAttribute('aria-pressed')).toBe('true')
})

it('嵌套回复头像 26、查看全部可展开；底部输入框圆角999、发送圆 33 主绿，发送后新评论出现', async () => {
  mount()
  const more = await screen.findAllByTestId('reply-more')
  fireEvent.click(more[0])
  expect(screen.getAllByTestId('reply-avatar')[0].style.width).toBe('26px')
  const input = screen.getByTestId('comment-input')
  expect((input.closest('[data-testid="composer"]') as HTMLElement).style.borderRadius).toBe('999px')
  expect(screen.getByTestId('comment-send').style.width).toBe('33px')
  fireEvent.change(input, { target: { value: 'mark一下' } })
  fireEvent.click(screen.getByTestId('comment-send'))
  await waitFor(() => expect(screen.getByText('mark一下')).toBeInTheDocument())
})

it('空白 / 纯空格发送被拒：输入保留、不新增评论条目、树不重算', async () => {
  mount()
  await screen.findAllByTestId('comment-text')
  const beforeCount = screen.getAllByTestId('comment-text').length
  const input = screen.getByTestId('comment-input')

  // 纯空格：addUserComment 返回 null → handleSend 返回 false，输入不清空、树不重算
  fireEvent.change(input, { target: { value: '   ' } })
  fireEvent.click(screen.getByTestId('comment-send'))
  expect(input).toHaveValue('   ')
  expect(screen.getAllByTestId('comment-text')).toHaveLength(beforeCount)
  expect(
    screen.getAllByTestId('comment-text').some((el) => el.textContent?.trim() === ''),
  ).toBe(false)

  // 空串方向：同样被拒，输入与条目数保持不变
  fireEvent.change(input, { target: { value: '' } })
  fireEvent.click(screen.getByTestId('comment-send'))
  expect(input).toHaveValue('')
  expect(screen.getAllByTestId('comment-text')).toHaveLength(beforeCount)
})

it('未知 postId 显示兜底与返回，不白屏', async () => {
  mount('不存在')
  expect(await screen.findByTestId('comments-not-found')).toBeInTheDocument()
})
