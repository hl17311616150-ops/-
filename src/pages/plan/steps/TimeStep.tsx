import { useEffect, useState } from 'react'
import type { StepProps } from '../stepProps'
import { addDays, computeTripTime } from '../../../lib/time'
import type { TimeAnchor, TimeOfDay } from '../../../lib/time'
import { cn } from '../../../lib/cn'

/** 三档时段（时间粒度锁三档，不做钟点） */
const PERIODS: Array<{ value: TimeOfDay; label: string }> = [
  { value: 'morning', label: '上午' },
  { value: 'afternoon', label: '下午' },
  { value: 'evening', label: '晚上' },
]

/** 合法日期形状：YYYY-MM-DD；输入过程中的半截字符串不进入汇总计算 */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

type Side = 'depart' | 'back'

/**
 * 三档时段分段控件：外层热区 44px（h-11），内层可见按钮 36px（h-9）。
 * 选中态品牌实色反白，未选中苔灰文字。
 */
function PeriodPicker({
  anchor,
  onSelect,
}: {
  anchor: TimeAnchor | null
  onSelect: (period: TimeOfDay) => void
}) {
  return (
    <div role="group" aria-label="时段选择" className="flex rounded-xl bg-muted p-1">
      {PERIODS.map(({ value, label }) => {
        const active = anchor?.period === value
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(value)}
            className={cn(
              'flex h-11 flex-1 items-center justify-center rounded-lg transition-colors',
              active ? 'bg-card font-medium text-primary shadow-sm' : 'text-muted-foreground',
            )}
          >
            <span className="flex h-9 items-center justify-center">{label}</span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * 时间步骤（Plan 2 第一步）：出发 / 返程日期 + 三档时段，自动汇总天数晚数、
 * 完整游玩日与首尾半天说明；总天数步进器以出发日期为基准联动返程日期。
 *
 * 本地 state 跟踪日期/时段：测试环境 update 只记录不回写 draft，若直接受控于
 * draft，输入值会被重置；外部（底部自然语言 parseTimeText）改 draft 时由 effect 同步。
 */
export default function TimeStep({ draft, update }: StepProps) {
  const [depart, setDepart] = useState<TimeAnchor | null>(draft.depart)
  const [back, setBack] = useState<TimeAnchor | null>(draft.back)

  // 外部（PlanFlow 底部输入经 parseTimeText）写入草稿时，同步本地 state；
  // 本地输入同时 setLocal 与 update，不依赖 draft 回写。
  useEffect(() => {
    setDepart(draft.depart)
  }, [draft.depart])
  useEffect(() => {
    setBack(draft.back)
  }, [draft.back])

  const applyDate = (side: Side, date: string) => {
    const current = side === 'depart' ? depart : back
    // 只设日期时补默认时段：出发上午、返程晚上
    const fallback: TimeOfDay = side === 'depart' ? 'morning' : 'evening'
    const next: TimeAnchor | null = date
      ? { date, period: current?.period ?? fallback }
      : null
    if (side === 'depart') {
      setDepart(next)
      update({ depart: next })
    } else {
      setBack(next)
      update({ back: next })
    }
  }

  const applyPeriod = (side: Side, period: TimeOfDay) => {
    const current = side === 'depart' ? depart : back
    const next: TimeAnchor = { date: current?.date ?? '', period }
    if (side === 'depart') {
      setDepart(next)
      if (next.date) update({ depart: next })
    } else {
      setBack(next)
      if (next.date) update({ back: next })
    }
  }

  const ready =
    depart !== null && back !== null && DATE_RE.test(depart.date) && DATE_RE.test(back.date)
  const summary = ready ? computeTripTime(depart, back) : null

  /** 步进器：以出发日期为基准重算返程日期，保证天数 / 返程日期 / 晚数三者一致；最小 1 天 */
  const changeDays = (delta: number) => {
    if (!depart?.date || !back?.date || !summary) return
    const nextDays = Math.max(1, summary.totalDays + delta)
    const nextBack: TimeAnchor = { date: addDays(depart.date, nextDays - 1), period: back.period }
    setBack(nextBack)
    update({ back: nextBack })
  }

  const confirm = () => {
    if (!ready) return
    update({ step: 'route' })
  }

  const departNote =
    depart?.period === 'afternoon'
      ? '首日下午出发，当天游玩时间偏短'
      : depart?.period === 'evening'
        ? '首日晚上出发，当晚赶路或直接入住'
        : '首日上午出发，当天可玩半天'

  const backNote =
    back?.period === 'morning'
      ? '末日上午返程，中午前到家'
      : back?.period === 'afternoon'
        ? '末日下午返程，傍晚前到家'
        : '末日晚上返程，玩到傍晚再走'

  return (
    <div className="space-y-3">
      {/* 出发时间卡 */}
      <section className="space-y-2.5 rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-medium text-foreground">出发时间</p>
        <input
          type="date"
          aria-label="出发日期"
          value={depart?.date ?? ''}
          onChange={(e) => applyDate('depart', e.target.value)}
          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-[15px] text-foreground outline-none focus:border-ring"
        />
        <PeriodPicker anchor={depart} onSelect={(p) => applyPeriod('depart', p)} />
      </section>

      {/* 返程时间卡 */}
      <section className="space-y-2.5 rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-medium text-foreground">返程时间</p>
        <input
          type="date"
          aria-label="返程日期"
          value={back?.date ?? ''}
          onChange={(e) => applyDate('back', e.target.value)}
          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-[15px] text-foreground outline-none focus:border-ring"
        />
        <PeriodPicker anchor={back} onSelect={(p) => applyPeriod('back', p)} />
      </section>

      {/* 行程时间汇总：出发/返程齐备后展示 */}
      {summary && depart && back && (
        <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-baseline justify-between">
            <p className="text-lg font-semibold text-foreground">
              {summary.totalDays}天{summary.nights}晚
            </p>
            <p className="text-xs text-muted-foreground">
              {depart.date} → {back.date}
            </p>
          </div>
          <p className="text-sm text-foreground">{summary.fullDays} 个完整游玩日</p>
          <div className="space-y-1 text-xs leading-relaxed text-muted-foreground">
            <p>{departNote}</p>
            <p>{backNote}</p>
          </div>

          {/* 总天数步进器：改天数联动返程日期与晚数 */}
          <div className="flex items-center justify-between rounded-xl bg-muted px-2 py-1.5">
            <button
              type="button"
              aria-label="减少天数"
              disabled={summary.totalDays <= 1}
              onClick={() => changeDays(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-lg text-foreground transition-colors hover:bg-card disabled:opacity-40 disabled:hover:bg-transparent"
            >
              −
            </button>
            <span className="text-sm font-medium text-foreground">共 {summary.totalDays} 天</span>
            <button
              type="button"
              onClick={() => changeDays(1)}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-lg text-foreground transition-colors hover:bg-card"
            >
              +
            </button>
          </div>
        </section>
      )}

      {/* 确认按钮：出发/返程齐备才可点 */}
      <button
        type="button"
        disabled={!ready}
        onClick={confirm}
        className="h-11 w-full rounded-full bg-primary text-[15px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        确认时间，下一步
      </button>
    </div>
  )
}
