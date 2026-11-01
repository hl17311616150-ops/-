import { expect, it } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import PublishPage from './PublishPage'
import { COVER_OPTIONS } from '../../../lib/community/userPosts'

/**
 * 测试夹具：MemoryRouter 初始进入 /publish；
 * /publish → PublishPage，/community → 占位 div，使发布后 navigate('/community') 可被断言。
 */
function renderPublish() {
  return render(
    <MemoryRouter initialEntries={['/publish']}>
      <Routes>
        <Route path="/publish" element={<PublishPage />} />
        <Route path="/community" element={<div data-testid="after-publish" />} />
      </Routes>
    </MemoryRouter>,
  )
}

it('头部返回圆 32、标题 15px、发布按钮白底胶囊 13px', async () => {
  renderPublish()
  const back = await screen.findByTestId('publish-back')
  expect(back.style.width).toBe('32px')
  expect(screen.getByTestId('publish-header-title').style.fontSize).toBe('15px')
  const pub = screen.getByTestId('publish-submit-top')
  expect(pub.style.background).toBe('rgb(255, 255, 255)')
  expect(pub.style.fontSize).toBe('13px')
})

it('封面高 150 圆角15，更换封面按钮 10.5px 且点击切换封面', async () => {
  renderPublish()
  const cover = await screen.findByTestId('cover-pick')
  expect(cover.style.height).toBe('150px')
  expect(cover.style.borderRadius).toBe('15px')
  fireEvent.click(screen.getByTestId('change-cover'))
  expect((screen.getByTestId('cover-img') as HTMLImageElement).src).toContain(COVER_OPTIONS[1])
})

it('标题输入 17px 衬线；勾选框 19 圆角6，取消勾选减少选中；可见范围三段选中白底', async () => {
  renderPublish()
  expect((await screen.findByTestId('title-input')).style.fontSize).toBe('17px')
  const cks = screen.getAllByTestId('diary-check')
  expect(cks[0].style.width).toBe('19px')
  expect(cks[0].style.borderRadius).toBe('6px')
  fireEvent.click(cks[0])
  // RTL 的 getByTestId 对重复 testid 会抛多匹配错误，取首项（刚取消勾选的第一条）断言 aria-checked
  expect(screen.getAllByTestId('diary-check')[0].getAttribute('aria-checked')).toBe('false')
  const vis = screen.getAllByTestId('visibility-option')
  fireEvent.click(vis[1])
  expect(vis[1].style.background).toBe('rgb(255, 255, 255)')
})

it('底部卡片角标 11px 浅绿，整理并发布主绿，点击后导航回社区', async () => {
  renderPublish()
  const tag = await screen.findByTestId('finalize-tag')
  expect(tag.style.fontSize).toBe('11px')
  expect(tag.style.color).toBe('rgb(156, 199, 158)')
  fireEvent.click(screen.getByTestId('finalize-primary'))
  await waitFor(() => expect(screen.getByTestId('after-publish')).toBeInTheDocument())
})
