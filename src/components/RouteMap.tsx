import { MapPin, Mountain, TreePine } from 'lucide-react'
import { Destinations } from '../data/destinations'
import type { RouteNode } from '../lib/trip'

/**
 * 手账风总路线示意图：出发点 → 途经点 → 目的地。
 * 手绘线条 + 手账贴纸感节点，点节点回调 onSelect。
 */
export function RouteMap({
  nodes,
  selectedKey,
  onSelect,
}: {
  nodes: RouteNode[]
  selectedKey: string | null
  onSelect: (key: string) => void
}) {
  const W = 520
  const H = 190
  const pad = 56
  const y = 74
  const n = nodes.length
  const stepX = n > 1 ? (W - pad * 2) / (n - 1) : 0
  const pts = nodes.map((node, i) => ({ x: n > 1 ? pad + i * stepX : W / 2, y, node, i }))
  const nameOf = (node: RouteNode) =>
    node.type === 'start' ? node.label ?? '' : Destinations.find((d) => d.id === node.destinationId)?.name ?? ''
  const colorOf = (node: RouteNode) =>
    node.type === 'start' ? 'var(--leaf)' : node.type === 'destination' ? 'var(--sun)' : 'var(--primary)'
  const dname = (id: string) => Destinations.find((d) => d.id === id)?.location ?? ''

  // 手绘感连接线：两节点间一条略带波浪的曲线
  const segPath = (a: { x: number; y: number }, b: { x: number; y: number }, k: number) => {
    const mx = (a.x + b.x) / 2
    const my = a.y + 26 + (k % 2 === 0 ? 2 : -2)
    return `M ${a.x} ${a.y} Q ${mx} ${my - 26} ${mx} ${my} Q ${mx} ${my + 26} ${b.x} ${b.y}`
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-[520px]" role="img" aria-label="总路线手账示意图">
      {/* 顶部手账小标题 */}
      <text x={W / 2} y={22} textAnchor="middle" className="fill-muted-foreground" fontSize={11}>
        归野 · 一路
      </text>

      {/* 装饰：左下山峦 */}
      <path d="M 30 178 Q 70 150 100 174 Q 128 152 158 176" fill="none" stroke="var(--leaf)" strokeWidth="1.6" strokeLinecap="round" opacity={0.55} />
      <path d="M 58 178 Q 90 160 124 177" fill="none" stroke="var(--leaf)" strokeWidth="1.4" strokeLinecap="round" opacity={0.4} />
      {/* 右上小太阳 */}
      <circle cx={W - 26} cy={26} r={9} fill="var(--sun)" opacity={0.85} />
      <circle cx={W - 26} cy={26} r={13} fill="none" stroke="var(--sun)" strokeWidth="1.2" opacity={0.5} />

      {/* 节点连接线 */}
      {pts.slice(1).map((p, idx) => (
        <path key={`seg${idx}`} d={segPath(pts[idx], p, idx)} fill="none" stroke="var(--leaf)" strokeWidth={2.6} strokeLinecap="round" opacity={0.7} />
      ))}
      {/* 沿线小点（手账虚线感） */}
      {pts.slice(0, -1).map((_, idx) => {
        const a = pts[idx]
        const b = pts[idx + 1]
        const mx = (a.x + b.x) / 2
        return <circle key={`dot${idx}`} cx={mx} cy={a.y + 26} r={2.4} fill="var(--leaf)" opacity={0.5} />
      })}

      {/* 节点 */}
      {pts.map(({ x, y, node, i }) => {
        const sel = node.key === selectedKey
        const color = colorOf(node)
        return (
          <g
            key={node.key}
            onClick={() => onSelect(node.key)}
            className="cursor-pointer"
            role="button"
            aria-label={`查看${nameOf(node)}详情`}
          >
            {sel && <circle cx={x} cy={y} r={21} fill="none" stroke={color} strokeWidth={2} strokeDasharray="4 3" />}
            <circle cx={x} cy={y} r={15} fill={color} stroke={sel ? 'var(--foreground)' : 'var(--background)'} strokeWidth={sel ? 2.2 : 1.4} />
            {/* 节点内小标：出发点/目的地贴纸感 */}
            <text x={x} y={y + 4} textAnchor="middle" fill="var(--background)" fontSize={9} fontWeight={600}>
              {node.type === 'start' ? '起' : node.type === 'destination' ? '到' : i}
            </text>
            <text x={x} y={y + 42} textAnchor="middle" className="fill-foreground" fontSize={13} fontWeight={600}>
              {nameOf(node)}
            </text>
            <text x={x} y={y + 58} textAnchor="middle" className="fill-muted-foreground" fontSize={10}>
              {node.type === 'start' ? '出发点' : dname(node.destinationId ?? '')}
            </text>
          </g>
        )
      })}

      {/* 底部小树点缀 */}
      <TreePine x={40} y={150} size={14} color="var(--leaf)" opacity={0.5} />
      <Mountain x={W - 60} y={140} size={14} color="var(--primary)" opacity={0.45} />
      <MapPin x={W / 2 - 7} y={H - 22} size={14} color="var(--sun)" opacity={0.6} />
    </svg>
  )
}
