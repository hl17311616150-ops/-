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

it('自驾段标里程（distanceKm>0）', () => {
  const d: DayPlan = { ...day, blocks: [{ period: 'morning', title: '自驾前往 景德镇', drive: { from: '长沙', to: '景德镇', distanceKm: 500, durationMin: 333 } }] }
  render(<DayCard day={d} cityLabel="长沙 → 景德镇" onSwapStay={() => {}} />)
  expect(screen.getByText(/500\s*km/)).toBeInTheDocument()
})

it('点换展开住宿并回调', async () => {
  const cb = vi.fn()
  render(<DayCard day={day} cityLabel="长沙" onSwapStay={cb} />)
  await userEvent.click(screen.getByTestId('swap-0'))
  await userEvent.click(screen.getByText('岳麓山·麓山民宿'))
  expect(cb).toHaveBeenCalledWith(0, 'stay-cs-2')
})
