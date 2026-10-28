import { Link } from 'react-router-dom'
import type { Destination } from '../types'

export function SeasonBadge({ months }: { months: number[] }) {
  return (
    <span className="rounded-full bg-accent/30 px-2 py-0.5 text-[11px] text-accent-foreground">
      适宜 {months.join('、')} 月
    </span>
  )
}

export default function DestinationCard({ d }: { d: Destination }) {
  return (
    <Link
      to={`/destination/${d.id}`}
      className="group block overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-sm"
    >
      {/* 无图片：以苔绿色块 + 类型首字做占位（v1 内置文本数据，不引外部图） */}
      <div className="flex h-24 items-end justify-between bg-gradient-to-br from-leaf/30 to-accent/40 px-4 pb-2">
        <span className="font-display text-2xl text-primary/80">{d.name.slice(0, 2)}</span>
        <span className="text-[11px] text-muted-foreground">{d.location}</span>
      </div>
      <div className="px-4 py-3">
        <h3 className="font-display text-lg leading-tight">{d.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{d.intro}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {d.typeTags.slice(0, 3).map((t) => (
            <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-primary">
              {t}
            </span>
          ))}
        </div>
      </div>
    </Link>
  )
}
