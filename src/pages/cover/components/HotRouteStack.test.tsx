import { expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HotRouteStack from './HotRouteStack'

const WHEEL_COOLDOWN_MS = 300

function renderStack() {
  return render(
    <MemoryRouter>
      <HotRouteStack />
    </MemoryRouter>,
  )
}

it('初始最前是川西（进详情），后面是滇西北/皖南（不进详情）', () => {
  renderStack()
  expect(screen.getByTestId('hot-card-chuanxi')).toHaveAttribute('href', '/community/chuanxi')
  expect(screen.getByTestId('hot-card-dianxibei')).not.toHaveAttribute('href')
  expect(screen.getByTestId('hot-card-wannan')).not.toHaveAttribute('href')
  // 最前卡片暴露 aria-current；其余卡片不暴露
  expect(screen.getByTestId('hot-card-chuanxi')).toHaveAttribute('aria-current', 'true')
  expect(screen.getByTestId('hot-card-dianxibei')).not.toHaveAttribute('aria-current')
  expect(screen.getByTestId('hot-card-wannan')).not.toHaveAttribute('aria-current')
  // 缩略图仅作装饰，名称由相邻文本提供可访问名，alt 留空避免屏幕阅读器重复朗读
  expect(screen.getByTestId('hot-card-chuanxi').querySelector('img')).toHaveAttribute('alt', '')
  expect(screen.getByTestId('hot-card-dianxibei').querySelector('img')).toHaveAttribute('alt', '')
  expect(screen.getByTestId('hot-card-wannan').querySelector('img')).toHaveAttribute('alt', '')
})

it('倒梯形：宽度递减、向下错开、居中对称', () => {
  renderStack()
  const c1 = screen.getByTestId('hot-card-chuanxi')
  const c2 = screen.getByTestId('hot-card-dianxibei')
  const c3 = screen.getByTestId('hot-card-wannan')
  expect(c1.style.width).toBe('100%')
  expect(c2.style.width).toBe('96%')
  expect(c3.style.width).toBe('92%')
  expect(c1.style.top).toBe('0px')
  expect(c2.style.top).toBe('10px')
  expect(c3.style.top).toBe('20px')
  expect(c2.style.left).toBe('2%')
  expect(c3.style.left).toBe('4%')
})

it('缩略图依次略小', () => {
  renderStack()
  expect(screen.getByTestId('hot-card-chuanxi').querySelector('img')).toHaveStyle({ width: '62px' })
  expect(screen.getByTestId('hot-card-dianxibei').querySelector('img')).toHaveStyle({ width: '59px' })
  expect(screen.getByTestId('hot-card-wannan').querySelector('img')).toHaveStyle({ width: '56px' })
})

it('最前卡片：衬线标题、浮起阴影、显示描述；后面卡片不显示描述', () => {
  renderStack()
  const front = screen.getByTestId('hot-card-chuanxi')
  const back = screen.getByTestId('hot-card-dianxibei')
  // 标题衬线 15px
  expect(front.querySelectorAll('span')[0]).toHaveStyle({ fontSize: '15px' })
  expect(front.querySelectorAll('span')[0].style.fontFamily).toContain('Noto Serif SC')
  // 最前卡片浮起阴影
  expect(front.style.boxShadow).toContain('0 10px 24px')
  // 最前显示描述，后面卡片不显示
  expect(front).toHaveTextContent('雪山、藏寨、高山海子环线')
  expect(back).not.toHaveTextContent('古城、雪山与高原湖泊')
})

it('滚轮向下（deltaY>0）：下一张到最前', () => {
  renderStack()
  fireEvent.wheel(screen.getByTestId('hot-route-stack'), { deltaY: 100 })
  expect(screen.getByTestId('hot-card-dianxibei')).toHaveAttribute('href', '/community/dianxibei')
  expect(screen.getByTestId('hot-card-chuanxi')).not.toHaveAttribute('href')
})

it('滚轮向上（deltaY<0）：回到上一张', () => {
  vi.useFakeTimers()
  renderStack()
  const stack = screen.getByTestId('hot-route-stack')
  fireEvent.wheel(stack, { deltaY: 100 })
  vi.advanceTimersByTime(WHEEL_COOLDOWN_MS)
  fireEvent.wheel(stack, { deltaY: -100 })
  expect(screen.getByTestId('hot-card-chuanxi')).toHaveAttribute('href', '/community/chuanxi')
  vi.useRealTimers()
})

it('滚轮冷却：连续两次滚轮只切换一次，冷却结束后可再次切换', () => {
  vi.useFakeTimers()
  renderStack()
  const stack = screen.getByTestId('hot-route-stack')
  // 背靠背两次向下滚轮：冷却窗口内第二次被忽略，最前仍是第二张（滇西北），第三张（皖南）未到最前
  fireEvent.wheel(stack, { deltaY: 100 })
  fireEvent.wheel(stack, { deltaY: 100 })
  expect(screen.getByTestId('hot-card-dianxibei')).toHaveAttribute('href', '/community/dianxibei')
  expect(screen.getByTestId('hot-card-wannan')).not.toHaveAttribute('href')
  // 冷却释放后，再一次滚轮应正常前进到第三张（皖南）
  vi.advanceTimersByTime(WHEEL_COOLDOWN_MS)
  fireEvent.wheel(stack, { deltaY: 100 })
  expect(screen.getByTestId('hot-card-wannan')).toHaveAttribute('href', '/community/wannan')
  vi.useRealTimers()
})

it('触摸：手指向上滑（clientY 减小）切换下一张', () => {
  renderStack()
  const stack = screen.getByTestId('hot-route-stack')
  fireEvent.touchStart(stack, { touches: [{ clientY: 80 }] })
  fireEvent.touchMove(stack, { touches: [{ clientY: 30 }] })
  fireEvent.touchEnd(stack, { changedTouches: [{ clientY: 30 }] })
  expect(screen.getByTestId('hot-card-dianxibei')).toHaveAttribute('href', '/community/dianxibei')
})

it('点击后面卡片直接切换到该张', () => {
  renderStack()
  fireEvent.click(screen.getByTestId('hot-card-wannan'))
  expect(screen.getByTestId('hot-card-wannan')).toHaveAttribute('href', '/community/wannan')
})

it('循环：滑过全部 6 张后回到第一张', () => {
  vi.useFakeTimers()
  renderStack()
  const stack = screen.getByTestId('hot-route-stack')
  for (let i = 0; i < 6; i += 1) {
    fireEvent.wheel(stack, { deltaY: 100 })
    vi.advanceTimersByTime(WHEEL_COOLDOWN_MS)
  }
  expect(screen.getByTestId('hot-card-chuanxi')).toHaveAttribute('href', '/community/chuanxi')
  vi.useRealTimers()
})
