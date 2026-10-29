import { expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SuggestionList from './SuggestionList'
import { buildPlan } from '../../../lib/plan/buildPlan'
import type { DayPlan, PlanningDraft } from '../../../types'
import { createDraft } from '../../../lib/planningDraft'

function setup() {
  const draft: PlanningDraft = {
    ...createDraft(),
    depart: { date: '2026-11-08', period: 'morning' },
    back: { date: '2026-11-13', period: 'evening' },
    points: ['长沙', '景德镇', '黟县', '宏村', '呈坎'],
    pointGrouping: { 宏村: '黟县' },
    selectedPois: {
      长沙: ['changsha-yuelushan'],
      景德镇: ['jdz-taoxichuan', 'jdz-guyao'],
      黟县: ['yixian-xidi'],
      宏村: ['hongcun-hongcun'],
      呈坎: ['chengkan-chengkan'],
    },
  }
  const days = buildPlan(draft)
  const onApply = vi.fn()
  render(<SuggestionList days={days} draft={draft} onApply={onApply} onBack={() => {}} />)
  return { onApply, days }
}

it('列出建议并可单条采纳', async () => {
  setup()
  const adopt = screen.getAllByRole('button', { name: '采纳' })
  expect(adopt.length).toBeGreaterThan(0)
  await userEvent.click(adopt[0])
  // 采纳后该条变为已采纳态
  expect(screen.getAllByText(/已采纳/).length).toBeGreaterThan(0)
})

it('全部采纳并重新生成：onApply 收到新行程且建议生效', async () => {
  const { onApply, days } = setup()
  await userEvent.click(screen.getByTestId('apply-all'))

  expect(onApply).toHaveBeenCalledTimes(1)
  expect(onApply).toHaveBeenCalledWith(expect.any(Array))

  const applied = onApply.mock.calls[0][0] as DayPlan[]
  // 天数与原行程一致，且为新数组引用（纯函数深拷贝，不原地改入参）
  expect(applied).toHaveLength(days.length)
  expect(applied).not.toBe(days)
  expect(days[1].stay?.stayId).toBe('stay-jd-1')

  // stay(b) 建议被应用：景德镇首晚（dayIndex=1）换成 stay-jd-2（古窑·瓷都民宿）
  expect(applied[1].stay?.stayId).toBe('stay-jd-2')
  expect(applied[1].stay?.name).toBe('古窑·瓷都民宿')
})

it('忽略补住宿建议：全部采纳时被忽略项不应用，其余建议仍生效', async () => {
  const { onApply, days } = setup()

  // 定位「补住宿」那条（推荐 古窑·瓷都民宿），只点该条的「忽略」
  const stayText = screen.getByText(/古窑·瓷都民宿/)
  const stayCard = stayText.closest('article')
  expect(stayCard).not.toBeNull()
  await userEvent.click(within(stayCard as HTMLElement).getByRole('button', { name: '忽略' }))

  await userEvent.click(screen.getByTestId('apply-all'))

  expect(onApply).toHaveBeenCalledTimes(1)
  const applied = onApply.mock.calls[0][0] as DayPlan[]
  expect(applied).toHaveLength(days.length)
  expect(applied).not.toBe(days)

  // 被忽略的 stay 建议未应用：景德镇首晚仍是原住宿 stay-jd-1（陶溪川智选假日）
  expect(applied[1].stay?.stayId).toBe('stay-jd-1')

  // pace 建议仍生效：自驾日（dayIndex=1）只余陶溪川，古窑移到下一天
  expect(applied[1].blocks.filter((b) => !b.drive).map((b) => b.poiId)).toEqual(['jdz-taoxichuan'])

  // route 建议仍生效：黟县第二晚统一为第一晚住宿并标记 changed
  expect(applied[4].stay?.changed).toBe(true)
  expect(applied[4].stay?.name).toBe(applied[3].stay?.name)
})
