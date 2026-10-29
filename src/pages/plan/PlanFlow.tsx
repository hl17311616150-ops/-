import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Send } from 'lucide-react'
import type { PlanningDraft, PlanningStep } from '../../types'
import { createDraft, getDraft, saveDraft } from '../../lib/planningDraft'
import type { TimeAnchor, TimeOfDay } from '../../lib/time'
import { parseTimeText } from '../../lib/plan/timeParse'
import { StepBar } from './components/StepBar'
import { ChatBubble } from './components/ChatBubble'
import type { StepProps } from './stepProps'
import TimeStep from './steps/TimeStep'

/** 各步骤占位文案（后续 Task 由真实步骤组件替换） */
const STEP_PLACEHOLDER: Record<PlanningStep, string> = {
  time: '【时间步骤】后续接入：出发 / 返程时间与出行天数',
  route: '【路线步骤】后续接入：出发点 → 途经点 → 目的地',
  points: '【选景点步骤】后续接入：勾选想去的景点',
  result: '【生成步骤】后续接入：生成完整行程方案',
}

/** 各步骤 AI 引导语（占位阶段先静态展示） */
const STEP_GREETING: Record<PlanningStep, string> = {
  time: '你好，我是归野规划助手～先告诉我打算什么时候出发、玩几天吧。',
  route: '时间定好了，接着说说你想走的路线吧。',
  points: '路线清楚了，挑几个你最想去的景点。',
  result: '信息齐了，正在为你生成行程方案。',
}

/** 合法时段取值（时间粒度锁三档） */
const PERIOD_VALUES: readonly TimeOfDay[] = ['morning', 'afternoon', 'evening']

/**
 * 锚点形状修复：旧数据里 date 不是字符串、或 period 不在三档内的锚点归一为 null；
 * 坏锚点不传入 computeTripTime / date 输入框，避免白屏。
 */
function normalizeAnchor(value: unknown): TimeAnchor | null {
  if (!value || typeof value !== 'object') return null
  const anchor = value as Record<string, unknown>
  if (typeof anchor.date !== 'string' || anchor.date.trim().length === 0) return null
  if (typeof anchor.period !== 'string' || !PERIOD_VALUES.includes(anchor.period as TimeOfDay)) return null
  return { date: anchor.date, period: anchor.period as TimeOfDay }
}

/**
 * 容错读取草稿：旧数据/缺字段用 createDraft 默认值兜底，数组与对象字段逐一校验，
 * 形状异常不抛错、不白屏；无草稿则新建并立即落盘。
 */
function loadDraft(): PlanningDraft {
  const fallback = createDraft()
  const existing = getDraft()
  if (!existing) {
    saveDraft(fallback)
    return fallback
  }
  return {
    ...fallback,
    ...existing,
    depart: normalizeAnchor(existing.depart) ?? fallback.depart,
    back: normalizeAnchor(existing.back) ?? fallback.back,
    points: Array.isArray(existing.points) ? existing.points : fallback.points,
    selectedPois:
      existing.selectedPois && typeof existing.selectedPois === 'object' && !Array.isArray(existing.selectedPois)
        ? existing.selectedPois
        : fallback.selectedPois,
    pointGrouping:
      existing.pointGrouping && typeof existing.pointGrouping === 'object' && !Array.isArray(existing.pointGrouping)
        ? existing.pointGrouping
        : fallback.pointGrouping,
    days: Array.isArray(existing.days) ? existing.days : fallback.days,
  }
}

/**
 * 占位步骤组件：接收统一 StepProps，后续 Task 按步骤替换为真实组件。
 * 当前仅渲染步骤占位文案，不消费 update / onUserInput。
 */
function StepPlaceholder({ draft }: StepProps) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
      {STEP_PLACEHOLDER[draft.step]}
    </div>
  )
}

/**
 * AI 规划四步流程容器（时间 → 路线 → 选景点 → 生成）。
 * 本 Task 只搭容器骨架：草稿加载/落盘、步骤状态切换、顶部返回、底部常驻输入框；
 * 各步骤真实交互由后续 Task 接入（StepProps 已按统一约定导出）。
 */
export default function PlanFlow() {
  const [draft, setDraft] = useState<PlanningDraft>(loadDraft)
  const [input, setInput] = useState('')

  // 初始化后落盘一次：首次进入已在 loadDraft 内保存；已有草稿刷新 updatedAt，保证续接一致。
  useEffect(() => {
    saveDraft(draft)
  }, [])

  /** 合并字段到草稿并持久化（步骤组件只允许通过此方法改草稿） */
  const update = (patch: Partial<PlanningDraft>) => {
    setDraft((d) => {
      const next = { ...d, ...patch }
      saveDraft(next)
      return next
    })
  }

  /**
   * 底部输入框提交：按当前步骤分发。
   * - time：自然语言经 parseTimeText 解析出出发/返程锚点后写回草稿；解析失败保持现状。
   * - route / points / result 分支由后续 Task 6 / 8 接入。
   */
  const handleUserInput = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    if (draft.step === 'time') {
      const now = new Date()
      const parsed = parseTimeText(trimmed, now.getFullYear(), now.getMonth() + 1)
      if (parsed) update({ depart: parsed.depart, back: parsed.back })
    }
  }

  const stepProps: StepProps = { draft, update, onUserInput: handleUserInput }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    handleUserInput(text)
    setInput('')
  }

  return (
    <div
      data-testid="page-plan"
      className="mx-auto flex h-[100svh] w-full max-w-[480px] flex-col bg-background"
    >
      {/* 顶部栏：返回首页 + 标题，返回热区 ≥44px */}
      <header className="flex items-center gap-1 px-2 pt-2">
        <Link
          to="/"
          aria-label="返回首页"
          className="flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-base font-semibold">AI 行程规划</h1>
      </header>

      <StepBar step={draft.step} />

      {/* 对话区：AI 问候 + 当前步骤；time 步接入 TimeStep，其余步骤仍为占位 */}
      <main className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        <ChatBubble who="ai">{STEP_GREETING[draft.step]}</ChatBubble>
        {draft.step === 'time' ? <TimeStep {...stepProps} /> : <StepPlaceholder {...stepProps} />}
      </main>

      {/* 底部常驻输入框：触控目标 ≥44px，回车提交 */}
      <footer className="border-t border-border bg-background px-3 pb-4 pt-2">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="补充需求，或直接说你的时间/路线…"
            aria-label="补充需求"
            className="h-11 min-w-0 flex-1 rounded-full border border-border bg-card px-4 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus:border-ring"
          />
          <button
            type="submit"
            aria-label="发送"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </footer>
    </div>
  )
}
