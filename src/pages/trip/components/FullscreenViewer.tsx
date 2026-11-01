import { useEffect, useMemo, useRef, useState, type JSX } from 'react'
import { ChevronLeft, ChevronRight, MapPin, X } from 'lucide-react'
import { getAlbum } from '../../../lib/album'
import { formatFullscreenTime, resolvePlace } from '../../../lib/review/place'
import type { PhotoStreamItem } from '../../../lib/review/photoStream'

/**
 * 行程回顾 · 全屏照片·日记联动视图：
 * 点照片进入，底部日记文字随照片走；同一条日记的多张照片共用文字，
 * 翻到下一条日记才更新地点与文字。支持按钮 / 键盘左右翻页、条目级页面点、
 * 3 行截断展开/收起。挂载时一次性读取相册库构建 id → url 映射（alive 标志防泄漏）。
 */
export default function FullscreenViewer({
  items,
  startIndex,
  onClose,
}: {
  items: PhotoStreamItem[]
  startIndex: number
  onClose: () => void
}): JSX.Element {
  const maxIndex = Math.max(0, items.length - 1)
  const [index, setIndex] = useState(() => Math.min(Math.max(0, startIndex), maxIndex))
  const [expanded, setExpanded] = useState(false)
  const [urlMap, setUrlMap] = useState<ReadonlyMap<string, string>>(() => new Map())
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    let alive = true
    getAlbum().then((all) => {
      if (!alive) return
      const map = new Map<string, string>()
      for (const photo of all) map.set(photo.id, photo.url)
      setUrlMap(map)
    })
    return () => {
      alive = false
    }
  }, [])

  const go = (delta: number) => {
    setIndex((prev) => Math.min(Math.max(prev + delta, 0), maxIndex))
  }

  // 键盘左右翻页；index 变化后重新注册，保证闭包拿到最新边界
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  // 条目切换时收起展开状态
  const item = items[index]
  const shownEntryIndex = item?.entryIndex
  useEffect(() => {
    setExpanded(false)
  }, [shownEntryIndex])

  // 条目级页面点：按 entryIndex 去重，记录每条目首图在 items 中的下标
  const entrySequence = useMemo(() => {
    const seen = new Set<number>()
    const seq: { entryIndex: number; firstIndex: number }[] = []
    items.forEach((it, i) => {
      if (!seen.has(it.entryIndex)) {
        seen.add(it.entryIndex)
        seq.push({ entryIndex: it.entryIndex, firstIndex: i })
      }
    })
    return seq
  }, [items])

  if (!item) return <div data-testid="fs-root" style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#111' }} />

  const place = resolvePlace(item.entry.nodeId)
  const canPrev = index > 0
  const canNext = index < maxIndex

  // 触摸左右滑动（jsdom 无法驱动，留待浏览器走查人工验证；不阻塞按钮/键盘路径）
  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0]?.clientX ?? null
  }
  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current
    touchStartX.current = null
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
  }

  return (
    <div
      data-testid="fs-root"
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#111' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div style={{ position: 'relative', width: '100%', maxWidth: 480, height: '100%', margin: '0 auto', overflow: 'hidden' }}>
        {/* 当前照片 */}
        <img
          data-testid="fs-photo"
          src={urlMap.get(item.photoId)}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />

        {/* 顶栏 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            background: 'linear-gradient(180deg,rgba(0,0,0,.45),transparent)',
            zIndex: 2,
          }}
        >
          <button
            type="button"
            data-testid="fs-close"
            aria-label="关闭"
            onClick={onClose}
            style={{
              width: 44,
              height: 44,
              padding: 0,
              border: 'none',
              background: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: 'rgba(0,0,0,.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={15} color="#fff" />
            </span>
          </button>
          <span
            data-testid="fs-count"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#fff',
              background: 'rgba(0,0,0,.3)',
              padding: '4px 11px',
              borderRadius: 999,
            }}
          >
            {index + 1} / {items.length}
          </span>
        </div>

        {/* 左右翻页 */}
        <button
          type="button"
          data-testid="fs-prev"
          aria-label="上一张"
          disabled={!canPrev}
          onClick={() => go(-1)}
          style={{
            position: 'absolute',
            left: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 44,
            height: 44,
            padding: 0,
            border: 'none',
            background: 'none',
            color: 'rgba(255,255,255,.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: canPrev ? 'pointer' : 'default',
            opacity: canPrev ? 1 : 0.3,
            zIndex: 2,
          }}
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          data-testid="fs-next"
          aria-label="下一张"
          disabled={!canNext}
          onClick={() => go(1)}
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 44,
            height: 44,
            padding: 0,
            border: 'none',
            background: 'none',
            color: 'rgba(255,255,255,.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: canNext ? 'pointer' : 'default',
            opacity: canNext ? 1 : 0.3,
            zIndex: 2,
          }}
        >
          <ChevronRight size={20} />
        </button>

        {/* 底部日记文字层 */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: '40px 18px 22px',
            background: 'linear-gradient(0deg,rgba(0,0,0,.72) 0%,rgba(0,0,0,.4) 55%,transparent 100%)',
            zIndex: 1,
          }}
        >
          {place && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 8,
                fontSize: 12,
                color: '#e9f0e6',
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: 15,
                  height: 15,
                  borderRadius: '50%',
                  background: '#6FA879',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 'none',
                }}
              >
                <MapPin size={9} color="#fff" />
              </span>
              <span>
                {place.point} · {place.name}
              </span>
            </div>
          )}

          {item.entry.text && (
            <>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  lineHeight: 1.65,
                  color: '#f5f7f2',
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: expanded ? 'unset' : '3',
                  overflow: 'hidden',
                }}
              >
                {item.entry.text}
              </p>
              <button
                type="button"
                data-testid="fs-expand"
                onClick={() => setExpanded((v) => !v)}
                style={{
                  marginTop: 6,
                  padding: 0,
                  border: 'none',
                  background: 'none',
                  color: 'rgba(255,255,255,.85)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {expanded ? '收起' : '展开'}
              </button>
            </>
          )}

          <div style={{ fontSize: 11, color: 'rgba(240,244,238,.7)', marginTop: 9 }}>
            {formatFullscreenTime(item.entry.createdAt)} · 本条日记共 {item.entry.photoIds.length} 张
          </div>
        </div>

        {/* 条目级页面点 */}
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 5,
            zIndex: 2,
          }}
        >
          {entrySequence.map(({ entryIndex, firstIndex }) => {
            const active = item.entryIndex === entryIndex
            return (
              <button
                key={entryIndex}
                type="button"
                data-testid={`fs-dot-${entryIndex}`}
                aria-label={`第 ${entryIndex + 1} 条日记`}
                onClick={() => setIndex(firstIndex)}
                style={{
                  width: active ? 14 : 5,
                  height: 5,
                  borderRadius: active ? 3 : '50%',
                  background: active ? '#fff' : 'rgba(255,255,255,.4)',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
