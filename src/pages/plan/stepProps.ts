import type { PlanningDraft } from '../../types'

/**
 * AI 规划各步骤组件统一 props（后续 Task 的时间/路线/选景点/结果步骤组件均按此实现）。
 * - draft：当前规划草稿（只读传给步骤组件，修改一律走 update 合并落盘）
 * - update：合并字段到草稿并持久化
 * - onUserInput：用户在底部输入框提交的文本，交由当前步骤解释处理
 */
export interface StepProps {
  draft: PlanningDraft
  update: (patch: Partial<PlanningDraft>) => void
  onUserInput: (text: string) => void
}
