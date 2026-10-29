import {
  useRef,
  useState,
  type CSSProperties,
  type TouchEvent as ReactTouchEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import { Link } from 'react-router-dom'
import { HOT_ROUTES, type HotRoute } from '../../../data/hotRoutes'

interface LayoutSlot {
  width: string
  top: number
  left: string
  zIndex: number
  imgSize: number
}

/**
 * 倒梯形三卡布局（位置 0 最前 / 1 中层 / 2 最后）：
 * 宽度 100% / 96% / 92%，top 0 / 10 / 20px，left 0 / 2% / 4%，zIndex 3 / 2 / 1，缩略图 62 / 59 / 56px。
 */
const LAYOUT: readonly LayoutSlot[] = [
  { width: '100%', top: 0, left: '0%', zIndex: 3, imgSize: 62 },
  { width: '96%', top: 10, left: '2%', zIndex: 2, imgSize: 59 },
  { width: '92%', top: 20, left: '4%', zIndex: 1, imgSize: 56 },
]

/**
 * 渲染偏移：-1 为离开最前的上一张（隐藏但保留在 DOM 中，便于测试与过渡状态查询）；
 * 0/1/2 为当前可见的三张。
 */
const OFFSETS = [-1, 0, 1, 2] as const

const WHEEL_THRESHOLD = 8
const TOUCH_THRESHOLD = 30

interface HotRouteStackProps {
  routes?: readonly HotRoute[]
}

/**
 * 底部倒梯形热门卡片栈（归野 V4 首页封面 Task 6）：
 * 同时显示 start / start+1 / start+2 三张，对 routes.length 取模循环；
 * 桌面滚轮（deltaY>0 下一张、<0 上一张）与移动端触摸（上滑 next、下滑 prev）共用同一组 next/prev；
 * 最前卡片为 Link 进入社区详情，后两张为按钮，点击直接把该张切到最前。
 */
export default function HotRouteStack({ routes = HOT_ROUTES }: HotRouteStackProps) {
  const n = routes.length
  const [start, setStart] = useState(0)
  const touchStartY = useRef<number | null>(null)

  const at = (offset: number) => ((start + offset) % n + n) % n

  const next = () => setStart((s) => (s + 1) % n)
  const prev = () => setStart((s) => (s - 1 + n) % n)

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaY) < WHEEL_THRESHOLD) return
    if (event.deltaY > 0) next()
    else prev()
  }

  const handleTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0]
    if (touch) touchStartY.current = touch.clientY
  }

  const handleTouchEnd = (event: ReactTouchEvent<HTMLDivElement>) => {
    const touch = event.changedTouches[0]
    if (!touch || touchStartY.current === null) return
    const diff = touch.clientY - touchStartY.current
    touchStartY.current = null
    if (diff < -TOUCH_THRESHOLD) next()
    else if (diff > TOUCH_THRESHOLD) prev()
  }

  return (
    <div
      data-testid="hot-route-stack"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ position: 'relative', height: '96px', overflow: 'hidden', borderRadius: 16 }}
    >
      {OFFSETS.map((offset) => {
        const route = routes[at(offset)]
        if (!route) return null
        const leaving = offset === -1
        const slot = leaving ? null : LAYOUT[offset]

        const cardStyle: CSSProperties = {
          position: 'absolute',
          width: slot?.width,
          top: slot?.top,
          left: slot?.left,
          zIndex: slot?.zIndex,
          height: '72px',
          backgroundColor: '#fff',
          borderRadius: 16,
          display: leaving ? 'none' : 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 14px',
          boxSizing: 'border-box',
        }
        const imgSize = slot?.imgSize ?? LAYOUT[2].imgSize

        const content = (
          <>
            <img
              src={route.image}
              alt={route.name}
              style={{
                width: `${imgSize}px`,
                height: `${imgSize}px`,
                borderRadius: 12,
                objectFit: 'cover',
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#1f2a24',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {route.name}
              </span>
              <span style={{ fontSize: 11.5, color: '#6b7670', whiteSpace: 'nowrap' }}>
                {route.days}天 · {route.distanceKm}km ·{' '}
                <span style={{ color: '#2f9e63' }}>{route.difficulty}</span>
              </span>
            </div>
          </>
        )

        if (offset === 0) {
          return (
            <Link
              key={route.id}
              to={`/community/${route.id}`}
              data-testid={`hot-card-${route.id}`}
              style={{ ...cardStyle, textDecoration: 'none' }}
            >
              {content}
            </Link>
          )
        }

        return (
          <button
            key={route.id}
            type="button"
            data-testid={`hot-card-${route.id}`}
            onClick={() => setStart(at(offset))}
            style={{ ...cardStyle, border: 'none', cursor: 'pointer', textAlign: 'left', background: '#fff' }}
          >
            {content}
          </button>
        )
      })}
    </div>
  )
}
