import { useState } from 'react'
import { resolveCities } from '../../../lib/plan/buildPlan'
import { cn } from '../../../lib/cn'
import type { PlanningDraft } from '../../../types'

interface PlanMapProps {
  points: string[]
  pointGrouping?: Record<string, string>
}

/** SVG 画布尺寸与左右留白（坐标空间内布局，随容器宽度等比缩放） */
const W = 320
const H = 120
const PAD_X = 44

/**
 * 地图总览（本地示意，不接真实地图）：
 * - 复用 resolveCities 合并分组子点，只对合并后的城市画节点，子点在父城市旁小标注；
 * - 城市沿横向折线均布，相邻城市连线；节点可点，点击仅本地视觉高亮，不做跳转；
 * - 真实地图后续接入。
 */
export default function PlanMap({ points, pointGrouping }: PlanMapProps) {
  const [selected, setSelected] = useState<string | null>(null)

  // resolveCities 仅读取 points / pointGrouping；这里只传所需字段并做最小结构断言（非 any）
  const cities = resolveCities({ points, pointGrouping } as PlanningDraft)

  const layout = cities.map((city, i) => {
    const x = cities.length > 1 ? PAD_X + (i * (W - PAD_X * 2)) / (cities.length - 1) : W / 2
    const y = 62 + (i % 2 === 0 ? -14 : 14)
    return { ...city, x, y }
  })

  const linePoints = layout.map((c) => `${c.x},${c.y}`).join(' ')

  return (
    <section
      data-testid="plan-map"
      className="rounded-2xl border border-border bg-card p-4 shadow-sm"
      aria-label="行程城市路线总览"
    >
      <p className="mb-2 text-sm font-medium text-card-foreground">地图总览 · 本地示意（真实地图待接入）</p>

      {cities.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">暂无路线城市</p>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mx-auto w-full max-w-[320px]"
          role="img"
          aria-label="行程城市路线本地示意图"
        >
          {/* 相邻城市连线（折线轻微起伏） */}
          {layout.length > 1 && (
            <polyline
              points={linePoints}
              fill="none"
              stroke="var(--color-leaf)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.7}
            />
          )}

          {layout.map((city) => {
            const active = selected === city.city
            const subPoints = city.subPoints.filter((p) => p !== city.city)
            const toggle = () => setSelected(active ? null : city.city)
            return (
              <g
                key={city.city}
                data-testid={`map-node-${city.city}`}
                role="button"
                tabIndex={0}
                aria-label={`城市：${city.city}`}
                onClick={toggle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    toggle()
                  }
                }}
                className="cursor-pointer"
              >
                {/* 透明命中圆：保证可点区域直径 ≥44 坐标单位 */}
                <circle cx={city.x} cy={city.y} r={22} fill="transparent" />
                {active && (
                  <circle
                    cx={city.x}
                    cy={city.y}
                    r={12}
                    fill="none"
                    stroke="var(--color-primary)"
                    strokeWidth={1.6}
                    strokeDasharray="4 3"
                  />
                )}
                <circle
                  cx={city.x}
                  cy={city.y}
                  r={5.5}
                  fill={active ? 'var(--color-primary)' : 'var(--color-leaf)'}
                  stroke="var(--color-card)"
                  strokeWidth={1.5}
                />
                <text
                  x={city.x}
                  y={city.y + 24}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight={active ? 600 : 500}
                  className={cn('fill-card-foreground', active && 'fill-primary')}
                >
                  {city.city}
                </text>
                {subPoints.length > 0 && (
                  <text
                    x={city.x}
                    y={city.y + 38}
                    textAnchor="middle"
                    fontSize={9.5}
                    className="fill-muted-foreground"
                  >
                    {subPoints.join('、')}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      )}
    </section>
  )
}
