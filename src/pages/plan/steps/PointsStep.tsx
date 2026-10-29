import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { StepProps } from '../stepProps'
import { queryPois, defaultPoiIds } from '../../../lib/plan/pois'

/**
 * 容错归一 selectedPois：旧数据缺键、对象坏形状、单项非字符串 id 均不白屏；
 * 无法识别的形状归一为空对象。
 */
function normalizeSelectedPois(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const source = value as Record<string, unknown>
  const result: Record<string, string[]> = {}
  for (const [point, ids] of Object.entries(source)) {
    if (Array.isArray(ids)) {
      result[point] = ids.filter((id): id is string => typeof id === 'string')
    }
  }
  return result
}

/**
 * 选景点步骤（Plan 2 第三步）：逐点列出路线节点与已选摘要；
 * 点行进入点详情（本 Task 用 selectedPoint 占位，Task 9 替换为 PointDetail）；
 * “全部点帮我定”为每个未选点填入默认经典项；“生成完整行程”先补默认再原子推进 result。
 */
export default function PointsStep({ draft, update }: StepProps) {
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null)

  // 路线节点容错：坏形状归一为空数组，避免渲染抛错
  const points = Array.isArray(draft.points)
    ? draft.points.filter((p): p is string => typeof p === 'string')
    : []
  const selectedPois = normalizeSelectedPois(draft.selectedPois)

  // id → 名称映射：逐点取该点全量 POI 建立，供已选摘要解析首个景点名
  const nameMap = new Map<string, string>()
  for (const point of points) {
    for (const poi of queryPois(point, { page: 0, pageSize: 100 }).items) {
      nameMap.set(poi.id, poi.name)
    }
  }

  /** 构造完整 selectedPois：已有选中原样保留，空点补默认经典项 */
  const fillDefaults = (): Record<string, string[]> => {
    const next: Record<string, string[]> = {}
    for (const point of points) {
      const existing = selectedPois[point]
      next[point] = Array.isArray(existing) && existing.length > 0 ? existing : defaultPoiIds(point)
    }
    return next
  }

  /** 全部点帮我定：保留已有选择，未选点补默认经典项，一次 update 落盘 */
  const chooseAll = () => {
    update({ selectedPois: fillDefaults() })
  }

  /** 生成完整行程：未选点先补默认经典项，与 step:'result' 一次原子写入 */
  const generate = () => {
    update({ selectedPois: fillDefaults(), step: 'result' })
  }

  // 选中点若已不在路线节点内（外部改草稿），回退到列表视图
  const active = selectedPoint && points.includes(selectedPoint) ? selectedPoint : null

  return (
    <div className="space-y-3">
      {active ? (
        /* 点详情占位：Task 9 替换为 PointDetail；提供返回列表入口 */
        <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">{active}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            点详情后续接入：在这里勾选这个点想去的景点。
          </p>
          <button
            type="button"
            onClick={() => setSelectedPoint(null)}
            className="h-11 w-full rounded-full border border-border bg-background text-[15px] text-foreground transition-colors hover:bg-muted"
          >
            返回列表
          </button>
        </section>
      ) : (
        <>
          {/* 逐点列表行：首字方块 + 点名 + 已选摘要，整行可点（热区 min-h-14 ≥44px） */}
          <div className="space-y-2">
            {points.map((point) => {
              const ids = selectedPois[point] ?? []
              const firstName = ids[0] ? nameMap.get(ids[0]) : undefined
              const summary =
                ids.length > 0
                  ? firstName
                    ? `已选 ${ids.length} · ${firstName}…`
                    : `已选 ${ids.length}`
                  : '还没选，点进去'
              return (
                <button
                  key={point}
                  type="button"
                  onClick={() => setSelectedPoint(point)}
                  className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:bg-muted"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-base text-primary">
                    {point.charAt(0)}
                  </span>
                  <span className="min-w-0 flex-1 space-y-0.5">
                    <span className="block text-sm font-medium text-foreground">{point}</span>
                    <span className="block truncate text-xs text-muted-foreground">{summary}</span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                </button>
              )
            })}
          </div>

          {/* 底部两按钮：批量默认 / 生成完整行程 */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={chooseAll}
              className="h-11 w-full rounded-full border border-border bg-card text-[15px] font-medium text-foreground transition-colors hover:bg-muted"
            >
              全部点帮我定
            </button>
            <button
              type="button"
              onClick={generate}
              className="h-11 w-full rounded-full bg-primary text-[15px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              生成完整行程
            </button>
          </div>
        </>
      )}
    </div>
  )
}
