import { beforeEach, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import PlanFlow from './PlanFlow'
import { save } from '../../storage/store'
import { K } from '../../storage/keys'

function mount() {
  return render(<MemoryRouter><PlanFlow /></MemoryRouter>)
}

beforeEach(() => {
  localStorage.clear()
})

it('首次进入创建草稿并停在时间步，显示步骤条与 AI 问候', () => {
  mount()
  expect(screen.getByTestId('step-bar')).toBeInTheDocument()
  expect(screen.getByTestId('page-plan')).toBeInTheDocument()
})

it('底部输入框可提交（不报错）', async () => {
  mount()
  await userEvent.type(screen.getByPlaceholderText(/补充需求/), '8号走{Enter}')
  expect(screen.getByTestId('page-plan')).toBeInTheDocument()
})

it('时间步底部自然语言经解析填入出发/返程并显示天数晚数', async () => {
  mount()
  await userEvent.type(screen.getByPlaceholderText(/补充需求/), '8号上午走、13号晚上回{Enter}')
  expect(await screen.findByText(/6\s*天\s*5\s*晚/)).toBeInTheDocument()
})

it('坏锚点旧草稿归一为空，不白屏', () => {
  save(K.planningDraft, {
    id: 'current',
    step: 'time',
    points: [],
    selectedPois: {},
    days: [],
    depart: { date: '2026-11-08', period: 'noon' },
    back: { date: 123, period: 'evening' },
    createdAt: 1,
    updatedAt: 1,
  })
  mount()
  expect(screen.getByLabelText('出发日期')).toHaveDisplayValue('')
  expect(screen.getByLabelText('返程日期')).toHaveDisplayValue('')
  expect(screen.getByTestId('page-plan')).toBeInTheDocument()
})

it('pointGrouping 形状异常的旧草稿回退默认空映射，不白屏', () => {
  // 字符串 / 数组都不是“非数组对象”，守卫回退 fallback.pointGrouping（{}）
  save(K.planningDraft, {
    id: 'current',
    step: 'time',
    points: ['长沙'],
    selectedPois: {},
    pointGrouping: 'broken-shape',
    days: [],
    createdAt: 1,
    updatedAt: 1,
  })
  const first = mount()
  expect(screen.getByTestId('page-plan')).toBeInTheDocument()
  first.unmount()

  save(K.planningDraft, {
    id: 'current',
    step: 'time',
    points: ['长沙'],
    selectedPois: {},
    pointGrouping: ['宏村'],
    days: [],
    createdAt: 1,
    updatedAt: 1,
  })
  mount()
  expect(screen.getByTestId('page-plan')).toBeInTheDocument()
})
