import { beforeEach, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import HomeMainButton from './HomeMainButton'
import { createDraft, getDraft, saveDraft } from '../../../lib/planningDraft'
import type { HomeState } from '../../../lib/homeState'

const FRESH: HomeState = { kind: 'fresh' }
const DRAFT: HomeState = { kind: 'draft', stepLabel: '选景点', hint: '上次规划到“选景点”，还差一步' }
const GENERATED: HomeState = {
  kind: 'generated',
  title: '皖南古村 6 日',
  tripId: 't1',
  hint: '你有一份“皖南古村 6 日”',
}

beforeEach(() => {
  localStorage.clear()
})

function renderBtn(state: HomeState) {
  return render(
    <MemoryRouter>
      <HomeMainButton state={state} />
    </MemoryRouter>,
  )
}

it('fresh：开始规划，链接 /plan，无 hint 无小字', () => {
  renderBtn(FRESH)
  const btn = screen.getByTestId('home-main-button')
  expect(btn).toHaveTextContent('开始规划行程')
  expect(btn).toHaveAttribute('href', '/plan')
  expect(screen.queryByTestId('home-start-new')).toBeNull()
})

it('draft：继续规划 + hint + 小字', () => {
  renderBtn(DRAFT)
  expect(screen.getByTestId('home-main-button')).toHaveTextContent('继续规划行程')
  expect(screen.getByText('上次规划到“选景点”，还差一步')).toBeInTheDocument()
  expect(screen.getByTestId('home-start-new')).toBeInTheDocument()
})

it('generated：白色实心查看行程，链接 /trip/:id', () => {
  renderBtn(GENERATED)
  const btn = screen.getByTestId('home-main-button')
  expect(btn).toHaveTextContent('查看我的行程')
  expect(btn).toHaveAttribute('href', '/trip/t1')
})

// 裁决（Ruling）：jsdom 无布局引擎，getBoundingClientRect().top 恒为 0，brief 原用例 4 的
// 三状态 Y 坐标差值断言（d - f === 0）在无布局环境下恒成立、不验证任何东西。
// 改为结构性断言：三状态都渲染同一个固定 44px 高的状态槽（position:relative），
// fresh 槽内留空；draft/generated 的 hint 绝对定位贴底（bottom:12px）、单行 nowrap。
// 按钮 Y 不变由构造保证：无论有无 hint，槽高恒为 44px，按钮紧跟槽后，位置不随状态移动。
it('毛玻璃按钮：自适应内容（非全宽）、padding/字体/阴影、白底深箭头', () => {
  renderBtn(FRESH)
  const btn = screen.getByTestId('home-main-button')
  // 自适应内容：不写固定宽度，inline-flex
  expect(btn.style.width).toBe('')
  expect(btn.style.display).toBe('inline-flex')
  expect(btn.style.padding).toBe('9px 15px 9px 18px')
  expect(btn.style.fontSize).toBe('13px')
  expect(btn.style.boxShadow).toContain('0 6px 16px')
  // 箭头：白底 .85 + 深色箭头
  const arrow = btn.querySelectorAll('span')[1]
  expect(arrow.style.backgroundColor).toBe('rgba(255, 255, 255, 0.85)')
  expect(arrow.style.color).toBe('rgb(58, 74, 62)')
  // 按钮靠左（与标题/功能说明左对齐，mockup 里 Start Exploring 在左侧）
  expect(btn.parentElement?.style.alignItems).toBe('flex-start')
})

it('hint 左对齐、不居中（草稿/已生成）', () => {
  renderBtn(DRAFT)
  const slot = document.querySelector<HTMLElement>('[data-testid="home-state-slot"] span')
  expect(slot).not.toBeNull()
  expect(slot?.style.left).toBe('0px')
  expect(slot?.style.textAlign).toBe('')
})

it('已生成实心按钮：绿色圆 + 白箭头', () => {
  renderBtn(GENERATED)
  const btn = screen.getByTestId('home-main-button')
  const arrow = btn.querySelectorAll('span')[1]
  expect(btn.style.backgroundColor).toBe('rgb(255, 255, 255)')
  expect(arrow.style.backgroundColor).toBe('rgb(111, 168, 121)')
  expect(arrow.style.color).toBe('rgb(255, 255, 255)')
})

it('三状态状态槽恒为 44px：fresh 留空；draft/generated hint 贴底绝对定位单行', () => {
  // 同一用例内连续渲染三个状态，查询必须限定在各自容器内，避免多个同名 testid 互相干扰
  const fresh = renderBtn(FRESH)
  const freshSlot = fresh.container.querySelector<HTMLElement>('[data-testid="home-state-slot"]')
  expect(freshSlot).not.toBeNull()
  expect(freshSlot?.style.height).toBe('44px')
  expect(freshSlot?.style.position).toBe('relative')
  expect(freshSlot?.textContent?.trim()).toBe('')

  const draft = renderBtn(DRAFT)
  const draftSlot = draft.container.querySelector<HTMLElement>('[data-testid="home-state-slot"]')
  expect(draftSlot?.style.height).toBe('44px')
  expect(draftSlot?.style.position).toBe('relative')
  const draftHint = draft.container.querySelector<HTMLElement>('span')
  expect(draftHint?.textContent).toBe('上次规划到“选景点”，还差一步')
  expect(draftHint?.style.position).toBe('absolute')
  expect(draftHint?.style.bottom).toBe('12px')
  expect(draftHint?.style.whiteSpace).toBe('nowrap')

  const generated = renderBtn(GENERATED)
  const generatedSlot = generated.container.querySelector<HTMLElement>('[data-testid="home-state-slot"]')
  expect(generatedSlot?.style.height).toBe('44px')
  expect(generatedSlot?.style.position).toBe('relative')
  const generatedHint = generated.container.querySelector<HTMLElement>('span')
  expect(generatedHint?.textContent).toBe('你有一份“皖南古村 6 日”')
  expect(generatedHint?.style.position).toBe('absolute')
  expect(generatedHint?.style.bottom).toBe('12px')
  expect(generatedHint?.style.whiteSpace).toBe('nowrap')
})

it('小字点击清掉已有草稿并导航 /plan', async () => {
  const draft = createDraft()
  draft.step = 'points'
  saveDraft(draft)

  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomeMainButton state={DRAFT} />} />
        <Route path="/plan" element={<div data-testid="probe-plan" />} />
      </Routes>
    </MemoryRouter>,
  )

  await user.click(screen.getByTestId('home-start-new'))

  expect(getDraft()).toBeNull()
  expect(screen.getByTestId('probe-plan')).toBeInTheDocument()
})
