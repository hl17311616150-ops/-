import { Check } from 'lucide-react'
import type { PlanningStep } from '../../../types'
import { cn } from '../../../lib/cn'

/** 四步流程顺序与文案：时间 → 路线 → 选景点 → 生成 */
const STEPS: { key: PlanningStep; label: string }[] = [
  { key: 'time', label: '时间' },
  { key: 'route', label: '路线' },
  { key: 'points', label: '选景点' },
  { key: 'result', label: '生成' },
]

type DotState = 'done' | 'current' | 'todo'

/**
 * AI 规划四步进度条：
 * - 已完成：绿色实心圆点（带白色对勾）
 * - 当前：描边空心圆点
 * - 未到：灰色圆点
 * - 步骤间连接线：已完成段绿色，其余灰色
 */
export function StepBar({ step }: { step: PlanningStep }) {
  const currentIndex = Math.max(0, STEPS.findIndex((s) => s.key === step))

  return (
    <nav
      data-testid="step-bar"
      aria-label="AI 规划步骤进度"
      className="mx-auto flex w-full max-w-[480px] items-start px-5 pb-1 pt-3"
    >
      {STEPS.map((s, i) => {
        const state: DotState = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'todo'
        return (
          <div key={s.key} className="flex flex-1 items-start last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                aria-current={state === 'current' ? 'step' : undefined}
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full',
                  state === 'done' && 'bg-leaf text-primary-foreground',
                  state === 'current' && 'border-2 border-primary bg-card text-primary',
                  state === 'todo' && 'bg-muted text-muted-foreground',
                )}
              >
                {state === 'done' ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                ) : (
                  <span className={cn('h-2 w-2 rounded-full', state === 'current' ? 'bg-primary' : 'bg-muted-foreground/50')} />
                )}
              </span>
              <span
                className={cn(
                  'text-xs leading-none',
                  state === 'todo' ? 'text-muted-foreground' : 'font-medium text-foreground',
                )}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                aria-hidden
                className={cn('mx-1 mt-3 h-[2px] flex-1 rounded-full', i < currentIndex ? 'bg-leaf' : 'bg-muted')}
              />
            )}
          </div>
        )
      })}
    </nav>
  )
}
