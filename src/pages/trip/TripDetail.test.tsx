import { describe, beforeEach, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import TripDetail from './TripDetail'
import { save } from '../../storage/store'
import { K } from '../../storage/keys'
import { createTrip } from '../../types'
import { getAllPosts } from '../../lib/community/userPosts'
import { getTrip } from '../../lib/trip'

beforeEach(() => {
  localStorage.clear()
})

function renderAt(id = 't1') {
  return render(
    <MemoryRouter initialEntries={[`/trip/${id}`]}>
      <Routes>
        <Route path="/trip/:id" element={<TripDetail />} />
        <Route path="/" element={<div data-testid="home" />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TripDetail 行程回顾页', () => {
  it('加载中显示 loading，就绪后渲染标题与默认日记 Tab', async () => {
    const trip = createTrip()
    trip.title = '皖南古村 6 日'
    trip.totalDays = 6
    save(K.trip, trip)
    renderAt()
    expect(screen.getByTestId('review-loading')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('皖南古村 6 日')).toBeInTheDocument())
    expect(screen.getByTestId('tab-diary')).toBeInTheDocument()
  })

  it('Tab 切换：照片 Tab 显示网格，计数文案「照片 · 38」', async () => {
    renderAt()
    await waitFor(() => expect(screen.getByTestId('tab-diary')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('tab-photos'))
    expect(screen.getByTestId('photo-grid')).toBeInTheDocument()
    expect(screen.getByText(/照片 · 38/)).toBeInTheDocument()
  })

  it('照片 Tab：点网格单元格打开全屏，关闭后返回列表', async () => {
    renderAt()
    await waitFor(() => expect(screen.getByTestId('tab-diary')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('tab-photos'))
    await userEvent.click(screen.getByTestId('grid-cell-seed_photo_01'))
    expect(screen.getByTestId('fs-root')).toBeInTheDocument()
    expect(screen.getByTestId('fs-count')).toHaveTextContent('1 / 38')
    await userEvent.click(screen.getByTestId('fs-close'))
    expect(screen.queryByTestId('fs-root')).toBeNull()
  })

  it('日记 Tab：点条目缩略图打开全屏并定位到该照片', async () => {
    renderAt()
    await waitFor(() => expect(screen.getByTestId('tab-diary')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('diary-photo-seed_photo_01'))
    expect(screen.getByTestId('fs-root')).toBeInTheDocument()
    expect(screen.getByTestId('fs-count')).toHaveTextContent('1 / 38')
  })

  it('顶部返回链接回首屏', async () => {
    renderAt()
    await waitFor(() => expect(screen.getByTestId('review-back')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('review-back'))
    expect(screen.getByTestId('home')).toBeInTheDocument()
  })

  it('回顾数据加载失败显示错误兜底，点重试重新加载后进入就绪视图', async () => {
    const trip = createTrip()
    trip.title = '皖南古村 6 日'
    trip.totalDays = 6
    save(K.trip, trip)
    const store = await import('../../lib/review/seedStore')
    const spy = vi.spyOn(store, 'getReviewData').mockRejectedValueOnce(new Error('IDB broken'))

    renderAt()
    await waitFor(() => expect(screen.getByTestId('review-error')).toBeInTheDocument())
    expect(screen.getByText('回顾加载失败，请重试')).toBeInTheDocument()

    spy.mockRestore()
    await userEvent.click(screen.getByTestId('review-retry'))
    await waitFor(() => expect(screen.getByText('皖南古村 6 日')).toBeInTheDocument())
    expect(screen.getByTestId('tab-diary')).toBeInTheDocument()
  })

  it('日记条目点「边走边发」后，getAllPosts 出现该 trip 的 ongoing 帖并提示已发到社区', async () => {
    renderAt()
    await waitFor(() => expect(screen.getByTestId('tab-diary')).toBeInTheDocument())

    const buttons = await screen.findAllByTestId('ongoing-publish-btn')
    expect(buttons.length).toBeGreaterThan(0)
    await userEvent.click(buttons[0])

    expect(await screen.findByText('已发到社区')).toBeInTheDocument()
    const ids = getAllPosts().map((p) => p.id)
    expect(ids).toContain(`ongoing_${getTrip().id}`)
  })
})
