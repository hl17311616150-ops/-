import { expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TimeStep from './TimeStep'
import { createDraft } from '../../../lib/planningDraft'

function setup() {
  const draft = createDraft()
  const update = vi.fn()
  render(<TimeStep draft={draft} update={update} onUserInput={() => {}} />)
  return { draft, update }
}

it('填出发/返程后显示 X天X晚', async () => {
  setup()
  const dates = screen.getAllByDisplayValue('')
  await userEvent.type(dates[0], '2026-11-08')
  await userEvent.type(dates[1], '2026-11-13')
  expect(screen.getByText(/6\s*天\s*5\s*晚/)).toBeInTheDocument()
})

it('点 + 增加总天数，返程日期顺延（Review Focus #3）', async () => {
  const { update } = setup()
  const dates = screen.getAllByDisplayValue('')
  await userEvent.type(dates[0], '2026-11-08')
  await userEvent.type(dates[1], '2026-11-13') // 6天
  await userEvent.click(screen.getByRole('button', { name: '+' })) // 7天
  expect(update).toHaveBeenCalledWith(expect.objectContaining({
    back: { date: '2026-11-14', period: 'evening' },
  }))
})

it('确认时间推进到路线步', async () => {
  const { update } = setup()
  const dates = screen.getAllByDisplayValue('')
  await userEvent.type(dates[0], '2026-11-08')
  await userEvent.type(dates[1], '2026-11-13')
  await userEvent.click(screen.getByRole('button', { name: /确认时间/ }))
  expect(update).toHaveBeenCalledWith(expect.objectContaining({ step: 'route' }))
})
