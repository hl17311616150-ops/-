import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { getTrip } from '../../lib/trip'
import { getReviewData } from '../../lib/review/seedStore'
import { buildPhotoStream } from '../../lib/review/photoStream'
import type { PhotoStreamItem } from '../../lib/review/photoStream'
import type { DiaryEntry, Trip } from '../../types'
import DiaryTab from './components/DiaryTab'
import PhotoGridTab from './components/PhotoGridTab'
import FullscreenViewer from './components/FullscreenViewer'

type ReviewTab = 'diary' | 'photos'

interface ViewerState {
  open: boolean
  index: number
}

/**
 * 行程回顾页（路由 /trip/:id）：
 * 挂载时一次性读取当前行程 → getReviewData 组装日记条目 → buildPhotoStream 扁平照片流；
 * 日记 / 照片双 Tab 受控切换；点照片按 photoId 在流中定位后打开全屏联动视图。
 * useParams 的 id 仅用于路由匹配：阶段 0 单行程，不按 id 过滤。
 */
export default function TripDetail() {
  useParams()

  const [ready, setReady] = useState(false)
  const [trip, setTrip] = useState<Trip | null>(null)
  const [entries, setEntries] = useState<DiaryEntry[]>([])
  const [stream, setStream] = useState<PhotoStreamItem[]>([])
  const [tab, setTab] = useState<ReviewTab>('diary')
  const [viewer, setViewer] = useState<ViewerState>({ open: false, index: 0 })

  useEffect(() => {
    let alive = true
    const current = getTrip()
    getReviewData(current).then(({ entries: list }) => {
      if (!alive) return
      setTrip(current)
      setEntries(list)
      setStream(buildPhotoStream(list))
      setReady(true)
    })
    return () => {
      alive = false
    }
  }, [])

  /** 点照片：在照片流中按 photoId 定位下标后打开全屏 */
  const handleOpenPhoto = (photoId: string) => {
    const index = stream.findIndex((item) => item.photoId === photoId)
    if (index < 0) return
    setViewer({ open: true, index })
  }

  const closeViewer = () => setViewer((v) => ({ ...v, open: false }))

  // 天数 / 晚数：晚数优先按 dayPlans 长度推算，否则 totalDays - 1，最小 0
  const totalDays = trip ? Math.max(1, trip.totalDays) : 1
  const nights = trip
    ? Math.max(0, trip.dayPlans && trip.dayPlans.length > 0 ? trip.dayPlans.length - 1 : totalDays - 1)
    : 0

  return (
    <div data-testid="page-trip" className="mx-auto flex h-[100svh] w-full max-w-[480px] flex-col bg-background page-slide">
      {!ready || !trip ? (
        <div
          data-testid="review-loading"
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a9488', fontSize: 13 }}
        >
          正在整理行程回顾…
        </div>
      ) : (
        <>
          {/* 顶部栏：返回首页，44×44 热区，ChevronLeft 24px（沿用 PlanFlow） */}
          <header className="flex items-center gap-1 px-2 pt-2">
            <Link
              to="/"
              aria-label="返回首页"
              data-testid="review-back"
              className="flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
            >
              <ChevronLeft className="h-6 w-6" />
            </Link>
          </header>

          {/* 头部区：行程标题（16px 衬线 #2f3d33）+ 天数晚数副标题（11px #8a9488） */}
          <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #eef0ec' }}>
            <h1
              style={{
                fontSize: 16,
                fontFamily: '"Noto Serif SC", "Songti SC", serif',
                color: '#2f3d33',
                lineHeight: 1.4,
              }}
            >
              {trip.title.trim() ? trip.title : '行程回顾'}
            </h1>
            <p style={{ fontSize: 11, color: '#8a9488', margin: '3px 0 0' }}>
              {totalDays}天{nights}晚
            </p>
          </div>

          {/* Tab 行：日记 / 照片 · N；激活 #3a4a3e + 700 + 2px #6FA879 下划线 */}
          <div style={{ display: 'flex', gap: 22, padding: '0 16px', borderBottom: '1px solid #eef0ec' }}>
            <button
              type="button"
              data-testid="tab-diary"
              onClick={() => setTab('diary')}
              style={{
                fontSize: 13,
                padding: '11px 2px',
                color: tab === 'diary' ? '#3a4a3e' : '#8a9488',
                fontWeight: tab === 'diary' ? 700 : 400,
                borderBottom: `2px solid ${tab === 'diary' ? '#6FA879' : 'transparent'}`,
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                background: 'none',
                cursor: 'pointer',
              }}
            >
              日记
            </button>
            <button
              type="button"
              data-testid="tab-photos"
              onClick={() => setTab('photos')}
              style={{
                fontSize: 13,
                padding: '11px 2px',
                color: tab === 'photos' ? '#3a4a3e' : '#8a9488',
                fontWeight: tab === 'photos' ? 700 : 400,
                borderBottom: `2px solid ${tab === 'photos' ? '#6FA879' : 'transparent'}`,
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                background: 'none',
                cursor: 'pointer',
              }}
            >
              照片 · {stream.length}
            </button>
          </div>

          {/* 内容区：纵向滚动，日记图文混排 / 照片网格 */}
          <main className="flex-1 overflow-y-auto">
            {tab === 'diary' ? (
              <DiaryTab entries={entries} onOpenPhoto={handleOpenPhoto} />
            ) : (
              <PhotoGridTab items={stream} onOpenPhoto={handleOpenPhoto} />
            )}
          </main>
        </>
      )}

      {/* 全屏照片 · 日记联动视图 */}
      {viewer.open && <FullscreenViewer items={stream} startIndex={viewer.index} onClose={closeViewer} />}
    </div>
  )
}
