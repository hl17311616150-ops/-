import { expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RouteStep from './RouteStep'
import { createDraft } from '../../../lib/planningDraft'

function setup(points: string[] = []) {
  const draft = { ...createDraft(), step: 'route' as const, points }
  const update = vi.fn()
  render(<RouteStep draft={draft} update={update} onUserInput={() => {}} />)
  return { update }
}

it('输入路线文字后出现校验结果', async () => {
  const { update } = setup()
  await userEvent.type(screen.getByPlaceholderText(/输入路线/), '长沙-黟县-宏村-呈坎{Enter}')
  expect(update).toHaveBeenCalledWith(expect.objectContaining({ points: expect.arrayContaining(['宏村']) }))
})

it('宏村+黟县时出现地理重叠决策', () => {
  setup(['长沙','黟县','宏村','呈坎'])
  expect(screen.getByText(/宏村在黟县境内/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /作为黟县重点村/ })).toBeInTheDocument()
})

it('确认去选景点推进 step', async () => {
  const { update } = setup(['长沙','景德镇','呈坎'])
  await userEvent.click(screen.getByRole('button', { name: /确认，去选景点/ }))
  expect(update).toHaveBeenCalledWith(expect.objectContaining({ step: 'points' }))
})
