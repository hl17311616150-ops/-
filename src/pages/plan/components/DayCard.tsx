import { useState } from 'react'
import type { DayPlan, ScheduledBlock } from '../../../types'
import { queryStays } from '../../../lib/plan/stays'

/** 时段英文键 → 中文小标 */
const PERIOD_LABEL: Record<ScheduledBlock['period'], string> = {
  morning: '上午',
  afternoon: '下午',
  evening: '晚上',
}

interface DayCardProps {
  day: DayPlan
  cityLabel: string
  onSwapStay: (dayIndex: number, stayId: string) => void
}

/**
 * 按天卡片（Plan 3 Task 6）：渲染一天的头部、普通时段块、自驾段与住宿行；
 * 点「换」按当天住宿城市展开 queryStays 候选，选择后回调 onSwapStay 并收起列表。
 */
export default function DayCard({ day, cityLabel, onSwapStay }: DayCardProps) {
  const [expanded, setExpanded] = useState(false)

  /** 仅在展开时查询候选，避免收起后仍持有无用列表 */
  const candidates = expanded && day.stay ? queryStays(day.stay.location) : []

  const toggleSwap = () => setExpanded((open) => !open)

  const chooseStay = (stayId: string) => {
    onSwapStay(day.dayIndex, stayId)
    setExpanded(false)
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      {/* 头部：Day 序号（1 基）+ 日期 + 当天城市/路线标签 */}
      <header className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h3 className="text-base font-semibold text-foreground">Day{day.dayIndex + 1}</h3>
          <span className="text-xs text-muted-foreground">{day.date}</span>
        </div>
        <span className="truncate text-xs text-muted-foreground">{cityLabel}</span>
      </header>

      {/* 当天时段块：普通块与自驾段按原顺序渲染 */}
      <div className="mt-3 space-y-3">
        {day.blocks.map((block, i) =>
          block.drive ? (
            <DriveBlock key={`${block.title}-${i}`} block={block} />
          ) : (
            <NormalBlock key={`${block.title}-${i}`} block={block} />
          ),
        )}
      </div>

      {/* 住宿行：名称 + 标签；右侧「换」按钮展开候选 */}
      {day.stay && (
        <section className="mt-3 space-y-2 border-t border-border pt-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">住宿</p>
              <p className="truncate text-sm font-medium text-foreground">{day.stay.name}</p>
              {day.stay.tags && day.stay.tags.length > 0 && (
                <p className="text-xs text-muted-foreground">{day.stay.tags.join('·')}</p>
              )}
            </div>
            <button
              type="button"
              data-testid={`swap-${day.dayIndex}`}
              onClick={toggleSwap}
              aria-expanded={expanded}
              className="h-11 shrink-0 rounded-xl border border-border bg-background px-4 text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              换
            </button>
          </div>

          {expanded && (
            <div className="space-y-2">
              {candidates.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => chooseStay(opt.id)}
                  className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">{opt.name}</span>
                    <span className="block text-xs text-muted-foreground">{opt.tags.join('·')}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">★ {opt.rating}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  )
}

/** 普通时段块：时段小标 + 名称 + 备注（有则显示） */
function NormalBlock({ block }: { block: ScheduledBlock }) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">{PERIOD_LABEL[block.period]}</span>
      <p className="text-sm font-medium text-foreground">{block.title}</p>
      {block.note && <p className="text-xs leading-relaxed text-muted-foreground">{block.note}</p>}
    </div>
  )
}

/** 自驾时长文案：不足 1 小时按分钟显示，满 1 小时按四舍五入小时显示，避免短途出现「约 0h」 */
function formatDriveDuration(durationMin: number): string {
  if (durationMin < 60) return `约 ${durationMin} 分钟`
  return `约 ${Math.round(durationMin / 60)}h`
}

/** 自驾段：虚线分隔；distanceKm > 0 才标里程时长，否则只显示标题 */
function DriveBlock({ block }: { block: ScheduledBlock }) {
  if (!block.drive) return null
  const { drive } = block

  return (
    <div className="space-y-1 border-t border-dashed border-border pt-3">
      <p className="text-sm font-medium text-foreground">{block.title}</p>
      {drive.distanceKm > 0 && (
        <p className="text-xs text-muted-foreground">
          {drive.distanceKm}km · {formatDriveDuration(drive.durationMin)}
        </p>
      )}
    </div>
  )
}
