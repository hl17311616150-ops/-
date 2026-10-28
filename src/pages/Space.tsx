import { Camera, Check, MapPin, Palette, RotateCcw, Share2, Star, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Destinations } from '../data/destinations'
import {
  addTripDiaryEntry,
  getArchivedTrips,
  getRecycledTrips,
  getVisited,
  markVisited,
  purgeRecycledTrip,
  recycleArchivedTrip,
  removeTripDiaryEntry,
  restoreRecycledTrip,
  sweepRecycledTrips,
  unmarkVisited,
  updateTripDiaryEntry,
  type RecycledTrip,
} from '../lib/footprint'
import { addToAlbum, getAlbum, getAlbumForTrip, removeFromAlbum, type AlbumPhoto } from '../lib/album'
import { getTrip, routeNodes } from '../lib/trip'
import { getCommunityPosts, getInteractionState, togglePostSave, type CommunityPost } from '../lib/community'
import { exportTripSnapshot } from '../lib/snapshot'
import {
  buildShareCardData,
  downloadShareCard,
  renderShareCardCanvas,
  resolveShareCover,
  shareThemeFromTokens,
} from '../lib/shareCard'
import type { Trip } from '../types'
import { cn } from '../lib/cn'
import { useTheme } from '../theme'
import BottomSheet from '../components/BottomSheet'
import ConfirmDialog from '../components/ConfirmDialog'
import DiaryPanel from '../components/DiaryPanel'

const destName = (id: string) => Destinations.find((d) => d.id === id)?.name ?? id

/**
 * 空间页：主页放三个独立入口（足迹 / 照片 / 主题），每个点击进各自的二级上拉面板。
 * 主页保持定死一屏；三个功能各自独立二级页，互不干扰。
 */
export default function Space() {
  const [, setV] = useState(0)
  const refresh = () => setV((x) => x + 1)
  const [sheet, setSheet] = useState<'footprint' | 'photos' | 'theme' | 'saves' | null>(null)
  // 足迹二级页里点开某条已出发行程 → 行程回顾 + 路线日记（归档后仍可编辑）
  const [openingTrip, setOpeningTrip] = useState<Trip | null>(null)
  const { theme } = useTheme()

  const visited = getVisited()
  // 收藏帖数（社区收藏状态，本地持久化）
  const savedCount = Object.values(getInteractionState()).filter((i) => i.saved).length
  // 相册库照片总数（异步，入口副标题显示）
  const [albumCount, setAlbumCount] = useState(0)
  useEffect(() => {
    let alive = true
    getAlbum().then((all) => alive && setAlbumCount(all.length))
    return () => {
      alive = false
    }
  }, [sheet, openingTrip])
  // 照片变化时同步刷新入口副标题
  const refreshAlbum = () => {
    refresh()
    getAlbum().then((all) => setAlbumCount(all.length))
  }

  return (
    <div className="flex h-full flex-col pt-2">
      <h1 className="font-display text-2xl">个人空间</h1>

      {/* 三个独立入口 */}
      <div className="mt-4 grid grid-cols-1 gap-3">
        <EntryCard
          icon={<MapPin size={18} />}
          title="走过的足迹"
          sub={visited.length === 0 ? '还没有标记去过的地方' : `${visited.length} 个地方`}
          onClick={() => setSheet('footprint')}
        />
        <EntryCard
          icon={<Camera size={18} />}
          title="照片墙"
          sub={albumCount === 0 ? '还没有照片' : `${albumCount} 张照片`}
          onClick={() => setSheet('photos')}
        />
        <EntryCard
          icon={<Palette size={18} />}
          title="主题"
          sub={`当前：${theme.label}`}
          onClick={() => setSheet('theme')}
        />
        <EntryCard
          icon={<Star size={18} />}
          title="收藏"
          sub={savedCount === 0 ? '还没有收藏' : `${savedCount} 条收藏`}
          onClick={() => setSheet('saves')}
        />
      </div>

      {/* 足迹二级页 */}
      <BottomSheet open={sheet === 'footprint'} onClose={() => setSheet(null)} title="走过的足迹" height="half">
        <FootprintPanel onChanged={refresh} onOpen={(t) => { setOpeningTrip(t); refresh() }} />
      </BottomSheet>

      {/* 行程回顾（从足迹点开）：只读回顾 + 路线日记（归档后仍可编辑） */}
      <BottomSheet open={!!openingTrip} onClose={() => setOpeningTrip(null)} title="行程回顾" height="tall">
        {openingTrip && (
          <TripReviewPanel
            trip={openingTrip}
            onChanged={() => {
              // 续写/编辑日记后重新读归档，保持回顾面板内容为最新
              const t = getArchivedTrips().find((x) => x.id === openingTrip.id)
              if (t) setOpeningTrip(t)
              refresh()
            }}
          />
        )}
      </BottomSheet>

      {/* 照片二级页 */}
      <BottomSheet open={sheet === 'photos'} onClose={() => setSheet(null)} title="照片墙" height="tall">
        <PhotosPanel onChanged={refreshAlbum} />
      </BottomSheet>

      {/* 主题二级页 */}
      <BottomSheet open={sheet === 'theme'} onClose={() => setSheet(null)} title="主题" height="half">
        <ThemePanel />
      </BottomSheet>

      {/* 收藏二级页：收藏的社区帖子（可点开详情、取消收藏） */}
      <BottomSheet open={sheet === 'saves'} onClose={() => setSheet(null)} title="收藏" height="tall">
        <SavesPanel />
      </BottomSheet>
    </div>
  )
}

/** 收藏二级页：展示收藏的社区帖子，可点开详情、取消收藏（本地持久化） */
function SavesPanel() {
  const [, setV] = useState(0)
  const refresh = () => setV((x) => x + 1)
  const posts = getCommunityPosts()
  const state = getInteractionState()
  const saved = posts.filter((p) => state[p.id]?.saved)
  const [opening, setOpening] = useState<CommunityPost | null>(null)

  if (saved.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">还没有收藏的帖子，去社区逛逛吧</p>
  }

  return (
    <div className="space-y-3">
      {saved.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => setOpening(p)}
          className="flex w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-3 text-left transition-colors hover:bg-muted"
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm text-white"
            style={{ background: `hsl(${p.author.avatarHue} 55% 55%)` }}
          >
            {p.author.avatarChar}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-sm">{p.routeTitle}</span>
            <span className="block truncate text-xs text-muted-foreground">{p.diarySummary}</span>
          </span>
        </button>
      ))}

      {/* 收藏详情（内层面板，层级高于外层） */}
      <BottomSheet open={!!opening} onClose={() => setOpening(null)} title="收藏详情" height="half" zIndex={60}>
        {opening && (
          <div className="space-y-3">
            <div
              className="flex h-36 items-end rounded-md px-3 pb-2"
              style={{
                background: `linear-gradient(135deg, hsl(${opening.photoHue} 42% 76%), hsl(${opening.photoHue} 52% 58%))`,
              }}
            >
              <span className="font-display text-base text-white/95">{opening.routeTitle}</span>
            </div>
            <p className="text-sm leading-relaxed">{opening.diarySummary}</p>
            <button
              type="button"
              aria-label="取消收藏"
              onClick={() => {
                togglePostSave(opening.id)
                setOpening(null)
                refresh()
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-full border border-destructive/40 bg-card py-2.5 text-sm text-destructive"
            >
              <Star size={16} /> 取消收藏
            </button>
          </div>
        )}
      </BottomSheet>
    </div>
  )
}

function EntryCard({
  icon,
  title,
  sub,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  sub: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3.5 text-left transition-colors hover:bg-muted"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
        {icon}
      </span>
      <span className="flex-1">
        <span className="block font-display text-base">{title}</span>
        <span className="block text-xs text-muted-foreground">{sub}</span>
      </span>
      <span className="text-muted-foreground">›</span>
    </button>
  )
}

/** 足迹二级页：已出发的行程（回顾） + 回收站 + 去过的路线 + 标记去过 */
function FootprintPanel({ onChanged, onOpen }: { onChanged: () => void; onOpen: (t: Trip) => void }) {
  const visited = getVisited()
  const archive = getArchivedTrips()
  // 回收站：删除的行程暂存于此（30 天自动清），可恢复/彻底删除
  const [recycled, setRecycled] = useState<RecycledTrip[]>([])
  // 二次确认目标：删除归档卡 / 彻底删除回收站项
  const [confirmDel, setConfirmDel] = useState<Trip | null>(null)
  const [confirmPurge, setConfirmPurge] = useState<RecycledTrip | null>(null)

  // 打开足迹页时惰性清理超 30 天前的回收站项，并刷新列表
  useEffect(() => {
    sweepRecycledTrips()
    setRecycled(getRecycledTrips())
  }, [])

  const refreshAll = () => {
    setRecycled(getRecycledTrips())
    onChanged()
  }

  return (
    <div className="space-y-4">
      {/* 已出发的行程：已完成出行的回顾档案，点开可回看并继续编辑日记；删除进回收站 */}
      {archive.length > 0 && (
        <section>
          <h2 className="mb-2 font-display text-base">已出发的行程</h2>
          <div className="space-y-2">
            {archive.map((t) => (
              <ArchivedTripCard
                key={t.id}
                trip={t}
                onOpen={() => onOpen(t)}
                onDelete={() => setConfirmDel(t)}
              />
            ))}
          </div>
        </section>
      )}

      {/* 回收站：删除过的行程，可恢复或彻底删除 */}
      {recycled.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 font-display text-base">
            <RotateCcw size={15} className="text-muted-foreground" /> 回收站（{recycled.length}）
            <span className="text-xs font-normal text-muted-foreground">· 30 天后自动清除</span>
          </h2>
          <div className="space-y-2">
            {recycled.map((t) => (
              <RecycledTripCard
                key={t.id}
                trip={t}
                onRestore={() => { restoreRecycledTrip(t.id); refreshAll() }}
                onPurge={() => setConfirmPurge(t)}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-display text-base">去过的路线</h2>
        {visited.length === 0 ? (
          <p className="text-sm text-muted-foreground">还没有标记去过的地方。</p>
        ) : (
          <div className="flex items-center overflow-x-auto pb-2">
            {visited.map((id, i) => (
              <div key={id} className="flex shrink-0 items-center">
                <div className="flex flex-col items-center">
                  <span className="flex h-3 w-3 rounded-full bg-leaf" />
                  <span className="mt-1 whitespace-nowrap text-xs text-muted-foreground">{destName(id)}</span>
                </div>
                {i < visited.length - 1 && <span className="mx-1 mb-4 h-px w-6 bg-border" />}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <p className="mb-1.5 text-xs text-muted-foreground">去过哪些地方？标记一下</p>
        <div className="flex flex-wrap gap-2">
          {Destinations.map((d) => {
            const done = visited.includes(d.id)
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  if (done) unmarkVisited(d.id)
                  else markVisited(d.id)
                  onChanged()
                }}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm',
                  done ? 'border-leaf bg-leaf/20 text-foreground' : 'border-border bg-card text-muted-foreground',
                )}
              >
                {done && <Check size={13} className="mr-1 inline text-leaf" />}
                {d.name}
              </button>
            )
          })}
        </div>
      </section>

      {/* 删除归档行程 → 进回收站（二次确认） */}
      <ConfirmDialog
        open={!!confirmDel}
        title="删除这条行程记录？"
        description="将移入回收站，30 天内可在回收站恢复。"
        confirmText="删除"
        onConfirm={() => {
          if (confirmDel) recycleArchivedTrip(confirmDel.id)
          setConfirmDel(null)
          refreshAll()
        }}
        onCancel={() => setConfirmDel(null)}
      />
      {/* 彻底删除回收站项（二次确认，不可恢复） */}
      <ConfirmDialog
        open={!!confirmPurge}
        title="彻底删除这条行程？"
        description="从回收站永久删除，无法恢复。"
        confirmText="彻底删除"
        onConfirm={() => {
          if (confirmPurge) purgeRecycledTrip(confirmPurge.id)
          setConfirmPurge(null)
          refreshAll()
        }}
        onCancel={() => setConfirmPurge(null)}
      />
    </div>
  )
}

/** 一条已出发行程的回顾卡：点开查看详情+继续编辑日记 */
function ArchivedTripCard({ trip, onOpen, onDelete }: { trip: Trip; onOpen: () => void; onDelete: () => void }) {
  // 路线节点：出发点 → 途经点 → 目的地
  const stops: string[] = []
  if (trip.startPoint) stops.push(trip.startPoint)
  if (trip.waypoints?.length) stops.push(...trip.waypoints.map(destName))
  if (trip.destinationId) stops.push(destName(trip.destinationId))
  const title = stops.length ? stops.join(' → ') : '未命名的行程'
  const date = trip.departDate ? `${trip.departDate.slice(5, 7)}月${trip.departDate.slice(8, 10)}日出发` : '未定日期'
  const diaryCount = Array.isArray(trip.diary) ? trip.diary.length : 0
  return (
    <div className="flex items-start gap-2 rounded-md border border-border bg-card px-3 py-2.5">
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <p className="text-sm leading-snug">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {date} · {trip.totalDays} 天
          {diaryCount > 0 && ` · 日记 ${diaryCount} 条`}
        </p>
      </button>
      <button
        type="button"
        aria-label="删除这条行程记录"
        onClick={onDelete}
        className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:text-destructive"
      >
        <Trash2 size={15} />
      </button>
    </div>
  )
}

/** 回收站里一条已删行程：可恢复 / 彻底删除 */
function RecycledTripCard({ trip, onRestore, onPurge }: { trip: RecycledTrip; onRestore: () => void; onPurge: () => void }) {
  const stops: string[] = []
  if (trip.startPoint) stops.push(trip.startPoint)
  if (trip.waypoints?.length) stops.push(...trip.waypoints.map(destName))
  if (trip.destinationId) stops.push(destName(trip.destinationId))
  const title = stops.length ? stops.join(' → ') : '未命名的行程'
  const deletedAt = new Date(trip.deletedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  return (
    <div className="flex items-start gap-2 rounded-md border border-dashed border-border bg-muted/40 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug line-through decoration-muted-foreground/40">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{deletedAt} 删除 · 30 天后自动清除</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label="恢复这条行程"
          onClick={onRestore}
          className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-foreground hover:bg-muted"
        >
          <RotateCcw size={13} /> 恢复
        </button>
        <button
          type="button"
          aria-label="彻底删除这条行程"
          onClick={onPurge}
          className="rounded-full p-1.5 text-muted-foreground hover:text-destructive"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}

/** 行程回顾：路线概览（只读）+ 路线日记（归档后仍可编辑）+ 分享卡片 */
function TripReviewPanel({ trip, onChanged }: { trip: Trip; onChanged: () => void }) {
  const { theme } = useTheme()
  const [shared, setShared] = useState(false)
  const stops: string[] = []
  if (trip.startPoint) stops.push(trip.startPoint)
  if (trip.waypoints?.length) stops.push(...trip.waypoints.map(destName))
  if (trip.destinationId) stops.push(destName(trip.destinationId))
  const title = stops.length ? stops.join(' → ') : '未命名的行程'

  // 分享：导出不可变快照 → 解析封面 → canvas 合成 4:5 图 → 下载
  const share = async () => {
    try {
      const snap = exportTripSnapshot(trip)
      const cover = await resolveShareCover(snap)
      const st = shareThemeFromTokens(theme.tokens)
      const data = buildShareCardData(snap, st, cover)
      const canvas = await renderShareCardCanvas(data)
      downloadShareCard(canvas)
      setShared(true)
      window.setTimeout(() => setShared(false), 2500)
    } catch {
      /* 分享卡生成失败：静默（数据不足时占位兜底已尽量，此处不中断回顾） */
    }
  }

  return (
    <div className="space-y-3">
      {/* 路线概览（只读回顾，路线不可改）+ 分享入口 */}
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-base">{title}</p>
          <button
            type="button"
            aria-label="分享"
            onClick={share}
            className="flex shrink-0 items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
          >
            <Share2 size={14} /> 分享
          </button>
        </div>
        {shared && <p className="mt-2 text-xs text-primary">已生成分享图，开始下载</p>}
        <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1">
          {routeNodes(trip).map((n, i) => (
            <span key={n.key} className="flex items-center gap-1.5 text-sm">
              {i > 0 && <span className="text-muted-foreground">→</span>}
              <span className={n.type === 'destination' ? 'font-medium text-leaf' : 'text-foreground'}>
                {n.label ?? destName(n.destinationId ?? '')}
              </span>
            </span>
          ))}
        </div>
      </div>
      {/* 路线日记：归档后仍可编辑（写回归档行程）；嵌入式，滚动交给外层回顾面板 */}
      <DiaryPanel
        open
        onClose={() => undefined}
        trip={trip}
        entries={Array.isArray(trip.diary) ? trip.diary : []}
        onChanged={onChanged}
        routeReadonly
        embedded
        onAdd={(e) => { addTripDiaryEntry(trip.id, e); onChanged() }}
        onUpdate={(id, patch) => { updateTripDiaryEntry(trip.id, id, patch); onChanged() }}
        onRemove={(id) => { removeTripDiaryEntry(trip.id, id); onChanged() }}
      />
    </div>
  )
}

/** 照片二级页：照片墙。展示"最近一次已出发行程"期间的照片（相册库），倒序+可翻更早+加照片入口 */
function PhotosPanel({ onChanged }: { onChanged: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  // 最近一次"已出发行程" = 进行中已出发(active) 与 已完成出行(归档) 中 departedAt 最大者
  const active = getTrip()
  const candidates = [
    active.departed && active.departedAt ? active : null,
    ...getArchivedTrips().filter((t) => t.departedAt != null),
  ].filter((t): t is Trip => t != null)
    .sort((a, b) => (b.departedAt ?? 0) - (a.departedAt ?? 0))
  const recentTrip = candidates[0] ?? null
  const [photos, setPhotos] = useState<AlbumPhoto[]>([])

  // 相册库照片：优先最近行程，无最近行程时回退展示全部（倒序）
  useEffect(() => {
    let alive = true
    const load = async () => {
      const all = recentTrip ? await getAlbumForTrip(recentTrip.id) : await getAlbum()
      if (alive) setPhotos(all)
    }
    load()
    return () => {
      alive = false
    }
  }, [recentTrip?.id])

  // 加照片：入库时关联最近行程（照片墙据此展示）；无行程时也允许（存相册库，回退展示）
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      await addToAlbum(file, recentTrip ? { tripId: recentTrip.id, takenAt: Date.now() } : {})
      onChanged()
      // 刷新本面板展示
      const all = recentTrip ? await getAlbumForTrip(recentTrip.id) : await getAlbum()
      setPhotos(all)
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-2.5 text-sm text-primary-foreground"
        >
          <Camera size={15} /> {busy ? '处理中…' : '加照片'}
        </button>
        <p className="text-xs text-muted-foreground">
          {recentTrip ? `最近出行：${recentTrip.departedAt ? new Date(recentTrip.departedAt).toLocaleDateString('zh-CN') : ''}` : '还没有已出发的行程'}
        </p>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">还没有照片，带一张回来吧。</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <div key={p.id} className="relative aspect-square overflow-hidden rounded-md">
              <img src={p.url} alt={`旅行照片 ${p.id.slice(-4)}`} className="h-full w-full object-cover" />
              {/* 删除按钮常驻（触屏/键盘均可达，不依赖 hover） */}
              <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/55 to-transparent p-1.5">
                <button
                  type="button"
                  aria-label="删除这张照片"
                  onClick={() => {
                    removeFromAlbum(p.id).then(() => {
                      setPhotos((prev) => prev.filter((x) => x.id !== p.id))
                      onChanged()
                    })
                  }}
                  className="rounded-full bg-white/90 p-1.5 text-foreground"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** 主题二级页：切换配色与氛围背景 */
function ThemePanel() {
  const { theme, themes, setTheme } = useTheme()
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {themes.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTheme(t.id)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-sm transition-colors',
              theme.id === t.id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">换一个风景主题，配色和氛围背景一起变。</p>
    </div>
  )
}
