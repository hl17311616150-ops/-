import { expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RouteStep from './RouteStep'
import { createDraft } from '../../../lib/planningDraft'

function setup(points: string[] = [], overrides: Partial<ReturnType<typeof createDraft>> = {}) {
  const draft = { ...createDraft(), step: 'route' as const, points, ...overrides }
  const update = vi.fn()
  render(<RouteStep draft={draft} update={update} onUserInput={() => {}} />)
  return { draft, update }
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

it('点“作为重点村”把 child 归入 parent 写入 pointGrouping', async () => {
  const { update } = setup(['长沙','黟县','宏村','呈坎'])
  await userEvent.click(screen.getByRole('button', { name: /作为黟县重点村/ }))
  expect(update).toHaveBeenCalledWith(expect.objectContaining({ pointGrouping: { 宏村: '黟县' } }))
})

it('选重点村时合并已有分组，不覆盖旧映射', async () => {
  const { update } = setup(['长沙','黟县','西递','宏村','呈坎'], { pointGrouping: { 西递: '黟县' } })
  await userEvent.click(screen.getByRole('button', { name: /把宏村作为黟县重点村/ }))
  expect(update).toHaveBeenCalledWith(expect.objectContaining({
    pointGrouping: expect.objectContaining({ 西递: '黟县', 宏村: '黟县' }),
  }))
})

it('按我原样来只推进步骤，不写分组', async () => {
  const { update } = setup(['长沙','景德镇','呈坎'])
  await userEvent.click(screen.getByRole('button', { name: '按我原样来' }))
  expect(update).toHaveBeenCalledWith(expect.objectContaining({ step: 'points' }))
  expect(update).not.toHaveBeenCalledWith(expect.objectContaining({ pointGrouping: expect.anything() }))
})
