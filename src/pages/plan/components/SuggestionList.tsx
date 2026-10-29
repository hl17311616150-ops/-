import { useState } from 'react'
import { suggest, applySuggestions } from '../../../lib/plan/suggest'
import type { Suggestion, SuggestionKind } from '../../../lib/plan/suggest'
import type { DayPlan, PlanningDraft } from '../../../types'
import { cn } from '../../../lib/cn'

/** 建议类型英文键 → 中文标签 */
const KIND_LABEL: Record<SuggestionKind, string> = {
  pace: '节奏',
  route: '顺路',
  stay: '补住宿',
}

/** 单条操作按钮基础样式：热区 h-11 ≥44px，可见焦点环；变体经 cn 合并 */
const ACTION_BASE =
  'h-11 flex-1 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

/** 底部整宽按钮基础样式：热区 h-11 ≥44px，可见焦点环；变体经 cn 合并 */
const FOOTER_BASE =
  'h-11 w-full rounded-full text-[15px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

interface SuggestionListProps {
  days: DayPlan[]
  draft: PlanningDraft
  /** 采纳完成：回传应用建议后的新行程，由上层落盘并退出建议视图 */
  onApply: (days: DayPlan[]) => void
  /** 不做改动，退出建议视图 */
  onBack: () => void
}

/**
 * AI 优化建议列表（Plan 3 Task 8）：
 * - 进入即由 suggest(days, draft) 生成全部建议，本地维护逐条状态；
 * - open 态给出「采纳」「忽略」，accepted/ignored 态只显示结果文字、不再出按钮；
 * - 「全部采纳并重新生成」把 open 视为 accepted（ignored 保持 ignored 不应用），
 *   经 applySuggestions 生成新行程后回传 onApply。
 */
export default function SuggestionList({ days, draft, onApply, onBack }: SuggestionListProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>(() => suggest(days, draft))

  /** 单条切换状态：仅更新对应 id，其余建议保持原状 */
  const updateStatus = (id: string, status: Suggestion['status']) => {
    setSuggestions((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)))
  }

  /** 全部采纳：open → accepted，ignored 保持 ignored；已是 accepted 的保持，再交纯函数应用 */
  const handleApplyAll = () => {
    const next = suggestions.map((item) =>
      item.status === 'open' ? { ...item, status: 'accepted' as const } : item,
    )
    const nextDays = applySuggestions(days, next, draft)
    onApply(nextDays)
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <header className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">AI 优化建议</h2>
        <p className="text-xs text-muted-foreground">逐条采纳或忽略，也可全部采纳后重新生成行程。</p>
      </header>

      <div className="space-y-3">
        {suggestions.map((item) => (
          <article
            key={item.id}
            className="space-y-2 rounded-xl border border-border bg-background p-3"
          >
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                {KIND_LABEL[item.kind]}
              </span>
            </div>

            <p className="text-sm font-medium leading-relaxed text-foreground">{item.text}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{item.why}</p>

            {item.status === 'open' && (
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => updateStatus(item.id, 'accepted')}
                  className={cn(
                    ACTION_BASE,
                    'bg-primary text-primary-foreground transition-opacity hover:opacity-90',
                  )}
                >
                  采纳
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus(item.id, 'ignored')}
                  className={cn(
                    ACTION_BASE,
                    'border border-border bg-card text-foreground hover:bg-muted',
                  )}
                >
                  忽略
                </button>
              </div>
            )}

            {item.status === 'accepted' && <p className="text-sm font-medium text-leaf">已采纳</p>}
            {item.status === 'ignored' && <p className="text-sm text-muted-foreground">已忽略</p>}
          </article>
        ))}
      </div>

      {/* 底部操作：全部采纳并重新生成 / 返回行程；热区 h-11 ≥44px */}
      <div className="space-y-2 pt-1">
        <button
          type="button"
          data-testid="apply-all"
          onClick={handleApplyAll}
          className={cn(
            FOOTER_BASE,
            'bg-primary text-primary-foreground transition-opacity hover:opacity-90',
          )}
        >
          全部采纳并重新生成
        </button>
        <button
          type="button"
          onClick={onBack}
          className={cn(FOOTER_BASE, 'border border-border bg-card text-foreground hover:bg-muted')}
        >
          返回行程
        </button>
      </div>
    </section>
  )
}
