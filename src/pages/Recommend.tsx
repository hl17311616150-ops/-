import { useMemo, useState } from 'react'
import type { Destination } from '../types'
import { Destinations } from '../data/destinations'
import { recommendByMonth } from '../lib/recommend'
import { addWaypoint, getTrip, setDestination } from '../lib/trip'
import { SeasonBadge } from '../components/DestinationCard'
import BottomSheet from '../components/BottomSheet'
import { EmptyHint } from './Home'

const INTENT_TYPES = ['登山徒步', '人文风景', '美食', '探险', '自然', '城市休闲']

/**
 * 推荐页：主页「一屏摘要」+ 点进上拉 tall 面板看全部。
 * 主页只放当前月前 3 个推荐 + 「查看全部」入口，定死一屏不可滚；
 * 意图筛选与搜索移入 tall 面板；点卡片 → 半屏详情 → 加入路线。
 */
export default function Recommend() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const trip = getTrip()
  const month = trip.departDate ? Number(trip.departDate.slice(5, 7)) : new Date().getMonth() + 1
  const list = recommendByMonth(Destinations, month)
  const preview = list.slice(0, 3)
  const selected = selectedId ? Destinations.find((d) => d.id === selectedId) ?? null : null

  function join(id: string) {
    if (!trip.destinationId) setDestination(id)
    else addWaypoint(id)
    setSelectedId(null)
    setNotice('已加入路线，去首页继续规划吧')
  }

  return (
    <div className="flex h-full flex-col pt-2">
      <header className="shrink-0">
        <h1 className="font-display text-2xl">本月去哪儿</h1>
        <p className="mt-1 text-sm text-muted-foreground">{month}月 · 先看几个，全部的去面板里挑</p>
      </header>

      {/* 一屏摘要：前 3 个（不撑过一屏，主页不可滚） */}
      <div className="mt-4 grid flex-1 grid-cols-1 content-start gap-3 overflow-hidden">
        {preview.length > 0 ? (
          preview.map((d) => (
            <RecommendCard key={d.id} d={d} onClick={() => setSelectedId(d.id)} />
          ))
        ) : (
          <EmptyHint text="这个月还没选出来，去面板里看看全部吧" />
        )}
      </div>

      {/* 查看全部入口（点开 tall 面板） */}
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="mt-4 w-full shrink-0 rounded-full border border-border bg-card px-4 py-3 text-center text-primary transition-colors hover:bg-muted"
      >
        查看全部目的地（{list.length} 个） →
      </button>

      {notice && (
        <p role="status" className="mt-3 rounded-lg border border-leaf/40 bg-leaf/10 px-4 py-2 text-sm text-primary">
          {notice}
        </p>
      )}

      {/* 二级 tall 面板：全部目的地 + 意图筛选 + 搜索 */}
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={`本月全部目的地`} height="tall">
        <FullList month={month} onPick={(id) => setSelectedId(id)} />
      </BottomSheet>

      {/* 目的地详情：半屏上拉面板（在 tall 面板上再叠，zIndex 更高） */}
      <BottomSheet
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected?.name ?? ''}
        height="half"
        zIndex={60}
        footer={
          selected && (
            <button
              type="button"
              onClick={() => join(selected.id)}
              className="w-full rounded-full bg-primary px-4 py-3 text-primary-foreground"
            >
              加入路线
            </button>
          )
        }
      >
        {selected && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{selected.location}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{selected.intro}</p>
            <div className="flex flex-wrap gap-1">
              {selected.typeTags.map((t) => (
                <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-primary">
                  {t}
                </span>
              ))}
            </div>
            <SeasonBadge months={selected.seasonMonths} />
            {selected.climate?.perMonth?.[month] && (
              <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                {month} 月 {selected.climate.perMonth[month].high}° / 低
                {selected.climate.perMonth[month].low}°，
                {selected.climate.perMonth[month].rain === '多雨'
                  ? '降水偏多'
                  : selected.climate.perMonth[month].rain === '干'
                    ? '较干燥'
                    : '雨量适中'}
              </div>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  )
}

/** tall 面板内：意图筛选 + 搜索 + 完整列表 */
function FullList({ month, onPick }: { month: number; onPick: (id: string) => void }) {
  const [intent, setIntent] = useState<string | undefined>(undefined)
  const [query, setQuery] = useState('')

  const full = useMemo(() => recommendByMonth(Destinations, month, intent), [month, intent])
  const q = query.trim().toLowerCase()
  const shown = useMemo(
    () => (q ? full.filter((d) => [d.name, d.location, ...d.typeTags].join(' ').toLowerCase().includes(q)) : full),
    [full, q],
  )

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜索目的地 / 地点 / 类型"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-leaf"
      />
      <div className="flex flex-wrap gap-2">
        <FilterChip active={!intent} onClick={() => setIntent(undefined)} label="全部" />
        {INTENT_TYPES.map((t) => (
          <FilterChip key={t} active={intent === t} onClick={() => setIntent(t)} label={t} />
        ))}
      </div>

      {shown.length > 0 ? (
        <div className="grid grid-cols-1 gap-3">
          {shown.map((d) => (
            <RecommendCard key={d.id} d={d} onClick={() => onPick(d.id)} />
          ))}
        </div>
      ) : (
        <EmptyHint text="没有匹配的目的地，换个类型或关键词试试" />
      )}
    </div>
  )
}

function RecommendCard({ d, onClick }: { d: Destination; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block overflow-hidden rounded-lg border border-border bg-card text-left transition-shadow hover:shadow-sm"
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
    </button>
  )
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'rounded-full bg-primary px-3 py-1.5 text-sm text-primary-foreground'
          : 'rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground'
      }
    >
      {label}
    </button>
  )
}
