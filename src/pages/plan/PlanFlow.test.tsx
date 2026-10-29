import { expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import PlanFlow from './PlanFlow'

function mount() {
  return render(<MemoryRouter><PlanFlow /></MemoryRouter>)
}

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
