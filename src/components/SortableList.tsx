import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '../lib/cn'
import { dragReorder } from '../lib/drag'

interface SortableListProps<T> {
  items: T[]
  getKey: (item: T) => string
  onReorder: (items: T[]) => void
  render: (item: T) => ReactNode
  itemClassName?: string
  handleClassName?: string
  /** 仅拖拽手柄可拖；否则整项可拖 */
  handleOnly?: boolean
  /** 长按多少毫秒后才激活拖拽（>0 时：短按=点击、长按=拖动） */
  activateDelay?: number
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max)
}

/** 被拖项从 from 移到 to 时，中间项的让位偏移 */
function shiftFor(i: number, from: number, to: number, h: number): number {
  if (from < to && i > from && i <= to) return -h
  if (from > to && i >= to && i < from) return h
  return 0
}

/**
 * 可复用拖拽排序列表（pointer 事件，触屏+鼠标）。
 * 拖拽时被拖项视觉跟随、邻项让位；松手提交最终顺序（onReorder）。
 * activateDelay>0 时支持"长按激活拖拽"：短按保留原生 click（可用于按钮切换），长按才进入拖拽。
 */
export default function SortableList<T>({
  items,
  getKey,
  onReorder,
  render,
  itemClassName,
  handleClassName,
  handleOnly = false,
  activateDelay = 0,
}: SortableListProps<T>) {
  const [drag, setDrag] = useState<{ from: number; dy: number } | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const startY = useRef(0)
  const itemH = useRef(1)
  // 长按判定的 pending 状态
  const pending = useRef<{ timer: ReturnType<typeof setTimeout> | null; fromIndex: number; activated: boolean }>({
    timer: null,
    fromIndex: 0,
    activated: false,
  })

  useEffect(() => {
    return () => {
      if (pending.current.timer) clearTimeout(pending.current.timer)
    }
  }, [])

  function cancelPending() {
    if (pending.current.timer) clearTimeout(pending.current.timer)
    pending.current = { timer: null, fromIndex: 0, activated: false }
  }

  function activate(e: React.PointerEvent, i: number) {
    cancelPending()
    pending.current.activated = true
    e.preventDefault() // 阻止 click，避免拖拽后触发切换
    startY.current = e.clientY
    itemH.current = (e.currentTarget as HTMLElement).offsetHeight || 1
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setDrag({ from: i, dy: 0 })
    setOver(i)
  }

  function begin(e: React.PointerEvent, i: number) {
    if (handleOnly && !(e.target as HTMLElement).closest('[data-drag-handle]')) return
    startY.current = e.clientY
    if (activateDelay > 0) {
      // 长按模式：不立即激活，启动计时；快速松手则视为点击
      pending.current = {
        timer: setTimeout(() => activate(e, i), activateDelay),
        fromIndex: i,
        activated: false,
      }
    } else {
      activate(e, i)
    }
  }

  function move(e: React.PointerEvent) {
    if (!drag) {
      // 长按模式：位移超过阈值也立即激活（手指/鼠标滑动）
      if (activateDelay > 0 && pending.current.timer && Math.abs(e.clientY - startY.current) > 8) {
        activate(e, pending.current.fromIndex)
      }
      return
    }
    const dy = e.clientY - startY.current
    const to = clamp(drag.from + Math.round(dy / itemH.current), 0, items.length - 1)
    setDrag({ from: drag.from, dy })
    setOver(to)
  }

  function end() {
    if (!drag) {
      // 未激活（短按）：取消长按计时，保留 click 行为（用于切换）
      cancelPending()
      return
    }
    cancelPending()
    if (over != null && over !== drag.from) {
      onReorder(dragReorder(items, drag.from, over))
    }
    setDrag(null)
    setOver(null)
  }

  return (
    <div className={cn('select-none')}>
      {items.map((item, i) => {
        const isDragging = drag?.from === i
        const dy = isDragging ? drag.dy : 0
        const lift = !isDragging && over != null && drag ? shiftFor(i, drag.from, over, itemH.current) : 0
        return (
          <div
            key={getKey(item)}
            onPointerDown={(e) => begin(e, i)}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            style={{ transform: `translateY(${dy + lift}px)`, transition: isDragging ? 'none' : 'transform .15s ease' }}
            className={cn(
              'touch-none',
              isDragging && 'relative z-10 cursor-grabbing opacity-80 shadow-lg',
              itemClassName,
              handleOnly && 'cursor-default',
              handleClassName && !isDragging && handleOnly ? '' : '',
            )}
          >
            {render(item)}
          </div>
        )
      })}
    </div>
  )
}
