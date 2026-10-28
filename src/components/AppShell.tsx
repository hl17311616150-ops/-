import { useCallback, useEffect, useRef, useState } from 'react'
import { getSectionOrder, setSectionOrder } from '../lib/sections'
import type { SectionId } from '../lib/sections'
import RightNav from './RightNav'
import Home from '../pages/Home'
import Recommend from '../pages/Recommend'
import Space from '../pages/Space'
import Community from '../pages/Community'

/**
 * 主界面：真正的页面切换（一次显示一页）。
 * 一级页面（首页/推荐/空间）：右侧按钮点击 / 内容区上下滑动切换。
 * "返回"= 层级返回：从二级（如首页内的行程规划）回到一级（品牌页），由各页自行处理。
 */
export default function AppShell() {
  const [order, setOrder] = useState<SectionId[]>(() => getSectionOrder())
  const [active, setActive] = useState<SectionId>(order[0] ?? 'home')
  const [canBack, setCanBack] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // 切到目标页（一级页面之间切换）。右侧导航键点击永远可用（主动离开），
  // 但滑动切页仍被 canBack 锁定（防误触丢二级视图）——见下方 onWheel/onTouchMove。
  // 切页先复位返回可用态（Home 重挂载后会按持久化 view 重新广播真实二级状态）。
  const go = useCallback((id: SectionId) => {
    if (id === active) return
    setCanBack(false)
    setActive(id)
  }, [active])

  // 返回 = 层级返回：通知当前页从二级收起回一级
  const onBack = useCallback(() => {
    window.dispatchEvent(new CustomEvent('gv:back-level'))
  }, [])

  // 监听当前页广播的"是否在二级"状态，驱动返回按钮可用态
  useEffect(() => {
    const onLevel = (e: Event) => {
      const d = (e as CustomEvent<{ inLevel?: boolean }>).detail
      setCanBack(!!d?.inLevel)
    }
    window.addEventListener('gv:level', onLevel)
    return () => window.removeEventListener('gv:level', onLevel)
  }, [])

  const handleReorder = (next: SectionId[]) => {
    setSectionOrder(next)
    setOrder(next)
    if (!next.includes(active)) go(next[0] ?? 'home')
  }

  // 全局跳转事件（首页"去推荐看看吧"、空态等触发切页）
  useEffect(() => {
    const onGoto = (e: Event) => {
      const d = (e as CustomEvent<{ section?: SectionId }>).detail
      if (d?.section) go(d.section)
    }
    window.addEventListener('gv:goto', onGoto)
    return () => window.removeEventListener('gv:goto', onGoto)
  }, [go])

  // 滑动切页：页面内容滚到边界后，继续滚轮/手指拖动即切换上/下一页
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const idx = order.indexOf(active)
    const prevId = idx > 0 ? order[idx - 1] : null
    const nextId = idx < order.length - 1 ? order[idx + 1] : null

    const canScrollDown = () => el.scrollHeight > el.clientHeight + 1
    const atTop = () => el.scrollTop <= 0
    const atBottom = () => el.scrollTop + el.clientHeight >= el.scrollHeight - 1

    const onWheel = (e: WheelEvent) => {
      if (canBack) return // 二级页面禁止滑动切页
      if (e.deltaY === 0) return
      if (e.deltaY > 0) {
        if (nextId && (atBottom() || !canScrollDown())) {
          go(nextId)
          e.preventDefault()
        }
      } else if (prevId && (atTop() || !canScrollDown())) {
        go(prevId)
        e.preventDefault()
      }
    }
    let sy = 0
    let dragging = false
    const onTouchStart = (e: TouchEvent) => {
      sy = e.touches[0].clientY
      dragging = true
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!dragging) return
      if (canBack) return // 二级页面禁止滑动切页
      const delta = e.touches[0].clientY - sy
      if (delta < -70 && nextId && (atBottom() || !canScrollDown())) {
        dragging = false
        go(nextId)
      } else if (delta > 70 && prevId && (atTop() || !canScrollDown())) {
        dragging = false
        go(prevId)
      }
    }
    const onTouchEnd = () => {
      dragging = false
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd)
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [order, active, go, canBack])

  return (
    <div className="mx-auto flex h-[100svh] w-full max-w-3xl flex-col overflow-hidden text-foreground">
      <header className="shrink-0 px-6 pt-7 pb-4">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-2xl tracking-wide text-primary">归野</span>
          <span className="text-sm text-muted-foreground">出去走走</span>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden px-5 pb-6">
        <div
          key={active}
          ref={scrollRef}
          className="page-slide h-full overflow-y-auto"
          aria-label="当前页面"
        >
          {active === 'home' && <Home />}
          {active === 'recommend' && <Recommend />}
          {active === 'space' && <Space />}
          {active === 'community' && <Community />}
        </div>
      </main>

      <RightNav
        order={order}
        active={active}
        canBack={canBack}
        onJump={go}
        onBack={onBack}
        onReorder={handleReorder}
      />
    </div>
  )
}
