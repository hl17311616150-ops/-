import { expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DayCard from './DayCard'
import type { DayPlan } from '../../../types'

const day: DayPlan = {
  dayIndex: 0,
  date: '2026-11-08',
  blocks: [
    { period: 'morning', title: '出发，前往 长沙', note: '首日行程不排满' },
    { period: 'afternoon', title: '岳麓山', poiId: 'changsha-yuelushan', note: '岳麓书院' },
  ],
  stay: { nightIndex: 0, name: '五一广场和颐酒店', location: '长沙', changed: false, stayId: 'stay-cs-1', rating: 4.6, tags: ['含早', '可停车'] },
}

it('渲染块与住宿', () => {
  render(<DayCard day={day} cityLabel="长沙" onSwapStay={() => {}} />)
  expect(screen.getByText('岳麓山')).toBeInTheDocument()
  expect(screen.getByText(/五一广场和颐酒店/)).toBeInTheDocument()
})

it('长途自驾段：333 分钟显示约 6h（distanceKm>0）', () => {
  const d: DayPlan = { ...day, blocks: [{ period: 'morning', title: '自驾前往 景德镇', drive: { from: '长沙', to: '景德镇', distanceKm: 500, durationMin: 333 } }] }
  render(<DayCard day={d} cityLabel="长沙 → 景德镇" onSwapStay={() => {}} />)
  expect(screen.getByText(/500\s*km/)).toBeInTheDocument()
  expect(screen.getByText(/约\s*6\s*h/)).toBeInTheDocument()
})

it('短途自驾段：27 分钟显示约 27 分钟，不出现 0h', () => {
  const d: DayPlan = { ...day, blocks: [{ period: 'morning', title: '自驾前往 呈坎', drive: { from: '黟县', to: '呈坎', distanceKm: 40, durationMin: 27 } }] }
  render(<DayCard day={d} cityLabel="黟县 → 呈坎" onSwapStay={() => {}} />)
  expect(screen.getByText(/40\s*km/)).toBeInTheDocument()
  expect(screen.getByText(/约\s*27\s*分钟/)).toBeInTheDocument()
  expect(screen.queryByText(/0\s*h/)).toBeNull()
})

it('点换展开住宿并回调', async () => {
  const cb = vi.fn()
  render(<DayCard day={day} cityLabel="长沙" onSwapStay={cb} />)
  await userEvent.click(screen.getByTestId('swap-0'))
  await userEvent.click(screen.getByText('岳麓山·麓山民宿'))
  expect(cb).toHaveBeenCalledWith(0, 'stay-cs-2')
})
