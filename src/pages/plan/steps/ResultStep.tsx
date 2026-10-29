import { useState } from 'react'
import type { StepProps } from '../stepProps'
import { buildPlan, resolveCities, allocateDays } from '../../../lib/plan/buildPlan'
import { saveGeneratedTrip } from '../../../lib/plan/saveTrip'
import { queryStays } from '../../../lib/plan/stays'
import PlanMap from '../components/PlanMap'
import DayCard from '../components/DayCard'
import type { DayPlan, Stay } from '../../../types'

/**
 * 结果步骤（Plan 3 Task 7）：把 buildPlan 生成的按天计划以地图 + 摘要条 + 按天卡片展示。
 * - 地图复用 PlanMap；摘要条给出天数晚数 / 自驾 / 城市数 / 景点数；
 * - cityLabel 按 resolveCities + allocateDays 展开，跨城第一天标 “上一城 → 本城”；
 * - 换住宿在本地不可变更新对应晚 stay；保存行程经 saveGeneratedTrip 写入 K.trip；
 * - “AI 再调整”仅切换展示布尔，SuggestionList 由 Task 8 挂载（届时再取用 update）。
 */
export default function ResultStep({ draft }: StepProps) {
  const [days, setDays] = useState<DayPlan[]>(() => buildPlan(draft))
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [saved, setSaved] = useState(false)

  const cities = resolveCities(draft)
  const dayCounts = allocateDays(cities, days.length, draft)

  /** 城市 → 逐天标签：非首城的第一天标 “上一城 → 本城”（含自驾段），其余标本城 */
  const cityLabels: string[] = []
  cities.forEach((city, c) => {
    const count = dayCounts[c] ?? 1
    for (let k = 0; k < count; k += 1) {
      cityLabels.push(k === 0 && c > 0 ? `${cities[c - 1].city} → ${city.city}` : city.city)
    }
  })

  /** POI 总数：统计各天带 poiId 的排程块 */
  const poiCount = days.reduce(
    (sum, day) => sum + day.blocks.filter((block) => block.poiId).length,
    0,
  )

  const nightCount = Math.max(0, days.length - 1)
  const routeTitle = cities.map((c) => c.city).join(' → ')

  /** 换住宿：按当天住宿城市查候选，选中后不可变更新该晚 stay；找不到选项保持原样 */
  const handleSwapStay = (dayIndex: number, stayId: string) => {
    setDays((prev) =>
      prev.map((day) => {
        if (day.dayIndex !== dayIndex || !day.stay) return day
        const option = queryStays(day.stay.location).find((opt) => opt.id === stayId)
        if (!option) return day
        const nextStay: Stay = {
          ...day.stay,
          changed: true,
          stayId: option.id,
          name: option.name,
          rating: option.rating,
          tags: [...option.tags],
        }
        return { ...day, stay: nextStay }
      }),
    )
  }

  /** 保存行程：转换并写入 K.trip，显示已保存提示；可多次保存，每次都重新提示 */
  const handleSave = () => {
    saveGeneratedTrip(draft, days)
    setSaved(true)
  }

  return (
    <div className="space-y-3">
      {/* 顶部标题：城市路线 + N 日 */}
      <h2 className="text-lg font-semibold text-foreground">
        {routeTitle} · {days.length}日
      </h2>

      <PlanMap points={draft.points} pointGrouping={draft.pointGrouping} />

      {/* 摘要条 chips：天数晚数 / 自驾 / 城市数 / 景点数 */}
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
          {days.length}天{nightCount}晚
        </span>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">自驾</span>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
          {cities.length}城
        </span>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
          {poiCount}景点
        </span>
      </div>

      {/* AI 建议区：Task 8 在此挂载 SuggestionList，本 Task 仅维护展示布尔 */}
      {showSuggestions && (
        <section className="rounded-2xl border border-dashed border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
          AI 优化建议（即将接入）
        </section>
      )}

      {/* 按天卡片：cityLabel 按分配结果逐天传入 */}
      <div className="space-y-3">
        {days.map((day, idx) => (
          <DayCard
            key={day.dayIndex}
            day={day}
            cityLabel={cityLabels[idx] ?? day.stay?.location ?? ''}
            onSwapStay={handleSwapStay}
          />
        ))}
      </div>

      {/* 保存成功提示：保存后常驻显示，再次保存仍显示 */}
      {saved && (
        <p data-testid="saved-tip" className="text-center text-sm font-medium text-leaf">
          行程已保存
        </p>
      )}

      {/* 底部操作：AI 再调整（Task 8 接入）/ 保存行程 */}
      <div className="space-y-2 pt-1">
        <button
          type="button"
          data-testid="ai-adjust"
          onClick={() => setShowSuggestions((open) => !open)}
          className="h-11 w-full rounded-full border border-border bg-card text-[15px] font-medium text-foreground transition-colors hover:bg-muted"
        >
          AI 再调整
        </button>
        <button
          type="button"
          data-testid="save-trip"
          onClick={handleSave}
          className="h-11 w-full rounded-full bg-primary text-[15px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          保存行程
        </button>
      </div>
    </div>
  )
}
