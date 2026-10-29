import { useState } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'
import type { StepProps } from '../stepProps'
import type { PlanningDraft } from '../../../types'
import { parseRouteText, recognizeRouteImage } from '../../../lib/plan/routeParse'
import { checkRoute, pruneGrouping } from '../../../lib/plan/routeCheck'
import type { RouteCheck } from '../../../lib/plan/routeCheck'
import { pruneSelectedPois } from '../../../lib/plan/pois'
import { computeTripTime } from '../../../lib/time'

/** 地理重叠本地决策：group=归入所属区域重点村；parallel=保持并列、不另算城市 */
type OverlapDecision = 'group' | 'parallel'

/**
 * 路线步骤（Plan 2 第二步）：文字 / 粘贴截图给出路线，本地解析写入 points；
 * points 齐备后跑 checkRoute 展示顺序 / 时间提示与地理重叠决策；
 * 重叠点可选“作为重点村”写入 pointGrouping，或“保持并列”不写分组；
 * 底部两按钮均推进到选景点步。
 *
 * 本地 state 跟踪输入文本与重叠决策：测试环境 update 只记录不回写 draft，
 * 直接受控于 draft 会导致输入值被重置（同 TimeStep 做法）。
 */
export default function RouteStep({ draft, update }: StepProps) {
  const [input, setInput] = useState('')
  const [decisions, setDecisions] = useState<Record<string, OverlapDecision>>({})

  // 出发/返程齐备才参与时间校验；缺锚点时 time 为 null，overlap / 顺序仍可显示
  const time = draft.depart && draft.back ? computeTripTime(draft.depart, draft.back) : null
  const checks = draft.points.length > 0 ? checkRoute(draft.points, time) : []

  /** 替换 points 时同步裁剪已离场点的分组映射与已选 POI，避免孤儿数据残留 */
  const patchReplacedPoints = (pts: string[]): Partial<PlanningDraft> => ({
    points: pts,
    pointGrouping: pruneGrouping(pts, draft.pointGrouping ?? {}),
    selectedPois: pruneSelectedPois(pts, draft.selectedPois ?? {}),
  })

  /** 文字提交：解析非空才写回草稿；空文本不动作 */
  const submitText = () => {
    const text = input.trim()
    if (!text) return
    const pts = parseRouteText(text)
    if (pts.length > 0) {
      update(patchReplacedPoints(pts))
      setInput('')
    }
  }

  /** 步骤内文本框回车提交；不使用嵌套 <form>（PlanFlow 底部已有 form） */
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      submitText()
    }
  }

  /** 粘贴图片：取剪贴板首个图片项，FileReader 读成 data URL 后本地识别；全程容错不白屏 */
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    try {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (!item.type.startsWith('image/')) continue
        const file = item.getAsFile()
        if (!file) continue
        const reader = new FileReader()
        reader.onload = () => {
          try {
            const dataUrl = typeof reader.result === 'string' ? reader.result : ''
            const pts = recognizeRouteImage(dataUrl)
            if (pts.length > 0) update(patchReplacedPoints(pts))
          } catch {
            // 识别失败保持现状，不抛错
          }
        }
        reader.onerror = () => {
          // 读取失败保持现状，不抛错
        }
        reader.readAsDataURL(file)
        break
      }
    } catch {
      // 粘贴异常不白屏
    }
  }

  /** 作为重点村：写入分组映射（旧数据 pointGrouping 缺失时兜底空对象） */
  const chooseGroup = (child: string, parent: string) => {
    setDecisions((d) => ({ ...d, [child]: 'group' }))
    update({ pointGrouping: { ...(draft.pointGrouping ?? {}), [child]: parent } })
  }

  /** 保持并列：不写分组，仅本地标记已决定 */
  const chooseParallel = (child: string) => {
    setDecisions((d) => ({ ...d, [child]: 'parallel' }))
  }

  const proceed = () => update({ step: 'points' })
  const ready = draft.points.length > 0

  return (
    <div className="space-y-3">
      {/* 步骤内路线输入：回车提交，支持直接粘贴路线截图；热区 h-11（44px） */}
      <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <input
          type="text"
          aria-label="输入路线"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="输入路线，如：长沙-景德镇-黟县"
          className="h-11 w-full rounded-xl border border-border bg-background px-3 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus:border-ring"
        />
        <p className="text-xs text-muted-foreground">也可以直接粘贴路线截图，我来帮你识别。</p>
      </section>

      {/* 校验结果：points 非空才渲染 */}
      {checks.map((check) => (
        <CheckCard
          key={`${check.kind}-${check.title}`}
          check={check}
          decision={check.child ? decisions[check.child] : undefined}
          onChooseGroup={chooseGroup}
          onChooseParallel={chooseParallel}
        />
      ))}

      {/* 底部两按钮：原样进入 / 确认去选景点，均推进到 points 步；空路线不可点 */}
      <div className="space-y-2 pt-1">
        <button
          type="button"
          disabled={!ready}
          onClick={proceed}
          className="h-11 w-full rounded-full border border-border bg-card text-[15px] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40"
        >
          按我原样来
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={proceed}
          className="h-11 w-full rounded-full bg-primary text-[15px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          确认，去选景点
        </button>
      </div>
    </div>
  )
}

/** 单条校验卡：overlap 带两个决策按钮；info 仅展示标题与说明 */
function CheckCard({
  check,
  decision,
  onChooseGroup,
  onChooseParallel,
}: {
  check: RouteCheck
  decision?: OverlapDecision
  onChooseGroup: (child: string, parent: string) => void
  onChooseParallel: (child: string) => void
}) {
  const isOverlap = check.kind === 'overlap' && check.child && check.parent

  return (
    <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
      <p className="text-sm font-medium text-foreground">{check.title}</p>
      <p className="text-xs leading-relaxed text-muted-foreground">{check.detail}</p>

      {isOverlap && (
        decision === undefined ? (
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={() => onChooseGroup(check.child!, check.parent!)}
              className="h-11 w-full rounded-xl bg-primary text-[15px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              把{check.child}作为{check.parent}重点村（推荐）
            </button>
            <button
              type="button"
              onClick={() => onChooseParallel(check.child!)}
              className="h-11 w-full rounded-xl border border-border bg-background text-[15px] text-foreground transition-colors hover:bg-muted"
            >
              保持并列
            </button>
          </div>
        ) : (
          <p className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
            {decision === 'group'
              ? `已把${check.child}归入${check.parent}重点村，不另算城市。`
              : `已保持${check.child}与${check.parent}并列。`}
          </p>
        )
      )}
    </section>
  )
}
