import { useState } from 'react'
import { ChevronLeft, MapPin, Star, Check, Search } from 'lucide-react'
import { queryPois } from '../../../lib/plan/pois'
import type { PoiCategory } from '../../../lib/plan/pois'
import { cn } from '../../../lib/cn'

type CategoryFilter = PoiCategory | 'all'
type SortKey = 'hot' | 'distance' | 'rating'

/** 分类 chips：other 不单独出 chip（归入“全部”浏览），与 mockup 一致 */
const CATEGORIES: Array<{ value: CategoryFilter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'nature', label: '自然风景' },
  { value: 'village', label: '古村古镇' },
  { value: 'museum', label: '博物馆' },
  { value: 'religion', label: '宗教文化' },
]

/** 排序映射：hot=热度固定序、distance=距离近→远、rating=评分高→低 */
const SORTS: Array<{ value: SortKey; label: string }> = [
  { value: 'hot', label: '热度' },
  { value: 'distance', label: '距离' },
  { value: 'rating', label: '评分' },
]

/** 分类展示标签（列表角标用） */
const CATEGORY_LABEL: Record<PoiCategory, string> = {
  nature: '自然风景',
  village: '古村古镇',
  museum: '博物馆',
  religion: '宗教文化',
  other: '其他',
}

/** 每页基准条数；懒加载一次取到当前页（pageSize = (page+1)*6） */
const PAGE_SIZE = 6

export interface PointDetailProps {
  point: string
  selectedIds: string[]
  onConfirm: (ids: string[]) => void
  onBack: () => void
}

/**
 * 点详情（Plan 2 选景点步内层视图）：单个路线节点下搜索 / 分类 / 排序 / 懒加载勾选 POI。
 *
 * - 工作集：本地 state 管理勾选，初值取 selectedIds 并去重；确认时整体回写。
 * - 懒加载：search/category/sort/page 本地状态；查询固定 page:0、pageSize=(page+1)*6，
 *   一次取到当前页；“加载更多”递增 page 重新取数；任一过滤条件变化都把 page 重置为 0。
 * - 容错：传入 selectedIds 坏形状在组件入口归一；库内无点（total=0）显示空态不白屏。
 */
export default function PointDetail({ point, selectedIds, onConfirm, onBack }: PointDetailProps) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [sort, setSort] = useState<SortKey>('hot')
  const [page, setPage] = useState(0)

  // 工作集：入口去重；非数组 / 非字符串 id（旧、坏数据）过滤掉，保证回写形状干净、不白屏
  const [chosen, setChosen] = useState<string[]>(() =>
    Array.isArray(selectedIds)
      ? Array.from(new Set(selectedIds.filter((id): id is string => typeof id === 'string')))
      : [],
  )

  // 固定 page:0，pageSize 随已加载页数增长；total 为过滤后、分页前总数
  const { items, total } = queryPois(point, {
    search,
    category,
    sort,
    page: 0,
    pageSize: (page + 1) * PAGE_SIZE,
  })

  /** 搜索词变化：重置到第一页 */
  const changeSearch = (value: string) => {
    setSearch(value)
    setPage(0)
  }

  /** 分类切换：重置到第一页 */
  const changeCategory = (value: CategoryFilter) => {
    setCategory(value)
    setPage(0)
  }

  /** 排序切换：重置到第一页 */
  const changeSort = (value: SortKey) => {
    setSort(value)
    setPage(0)
  }

  /** 点击行 / 名称 toggle 选中；已在工作集则移除，否则追加（去重） */
  const toggle = (id: string) => {
    setChosen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const loaded = items.length
  const exhausted = loaded >= total

  return (
    <div className="space-y-3">
      {/* 顶部：返回（热区 h-11 ≥44px）+ 标题 + 已选数量徽标 */}
      <header className="flex items-center gap-1">
        <button
          type="button"
          aria-label="返回列表"
          onClick={onBack}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-foreground">
          {point} · 选景点
        </h2>
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          {chosen.length}
        </span>
      </header>

      {/* 搜索框：本地受控，placeholder 含“搜索” */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => changeSearch(e.target.value)}
          placeholder="搜索景点名称"
          aria-label="搜索景点"
          className="h-11 w-full rounded-full border border-border bg-card pl-10 pr-4 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus:border-ring"
        />
      </div>

      {/* 分类 chips：整行可横滑；chip 热区 h-11 ≥44px，选中实色反白 */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map(({ value, label }) => {
          const active = category === value
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => changeCategory(value)}
              className={cn(
                'flex h-11 shrink-0 items-center rounded-full border px-3.5 text-sm transition-colors',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted',
              )}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* 排序分段控件：外层热区 h-11，内层可见 h-9 ≥36px */}
      <div role="group" aria-label="排序方式" className="flex rounded-xl bg-muted p-1">
        {SORTS.map(({ value, label }) => {
          const active = sort === value
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => changeSort(value)}
              className={cn(
                'flex h-11 flex-1 items-center justify-center rounded-lg transition-colors',
                active ? 'bg-card font-medium text-primary shadow-sm' : 'text-muted-foreground',
              )}
            >
              <span className="flex h-9 items-center justify-center">{label}</span>
            </button>
          )
        })}
      </div>

      {/* POI 列表 / 空态 */}
      {total === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-card/60 px-4 py-8 text-center text-sm text-muted-foreground">
          {search.trim() ? '没有找到相关景点，换个关键词试试' : '该点暂无景点'}
        </section>
      ) : (
        <>
          <div className="space-y-2">
            {items.map((poi) => {
              const active = chosen.includes(poi.id)
              return (
                <button
                  key={poi.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggle(poi.id)}
                  className={cn(
                    'flex min-h-14 w-full items-start gap-3 rounded-2xl border p-3 text-left transition-colors',
                    active ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted',
                  )}
                >
                  {/* 勾选态圆标：热区随整行 ≥44px */}
                  <span
                    className={cn(
                      'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors',
                      active ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-transparent',
                    )}
                  >
                    <Check className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{poi.name}</span>
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        {CATEGORY_LABEL[poi.category]}
                      </span>
                    </span>
                    <span className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-amber-500" />
                        {poi.rating.toFixed(1)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {poi.distanceKm} km
                      </span>
                    </span>
                    <span className="block text-xs leading-relaxed text-muted-foreground">{poi.desc}</span>
                  </span>
                </button>
              )
            })}
          </div>

          {/* 加载进度：已显示 N/总数；全部加载完隐藏“加载更多” */}
          <p className="text-center text-xs text-muted-foreground">
            已显示 {loaded}/{total}
          </p>
          {!exhausted && (
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              className="h-11 w-full rounded-full border border-border bg-card text-[15px] text-foreground transition-colors hover:bg-muted"
            >
              加载更多
            </button>
          )}
        </>
      )}

      {/* 底部：已选 N 个（独立文案，不并入确认按钮，保证按钮名称可被精确命中）+ 确认回写 */}
      <div className="space-y-2 pt-1">
        <p className="text-center text-sm text-muted-foreground">已选 {chosen.length} 个</p>
        <button
          type="button"
          onClick={() => { onConfirm(chosen); onBack() }}
          className="h-11 w-full rounded-full bg-primary text-[15px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          确认
        </button>
      </div>
    </div>
  )
}
