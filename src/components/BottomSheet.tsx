import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../lib/cn'

export type SheetHeight = 'half' | 'tall'

// 背景滚动锁用引用计数：多个面板叠加/接替时，
// 只有最后一个面板关闭才真正恢复 body 滚动，避免旧面板 cleanup 提前释放。
let bodyLockCount = 0
let savedOverflow = ''
function lockBodyScroll() {
  if (bodyLockCount === 0) {
    savedOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  bodyLockCount += 1
}
function unlockBodyScroll() {
  bodyLockCount = Math.max(0, bodyLockCount - 1)
  if (bodyLockCount === 0) document.body.style.overflow = savedOverflow
}

interface BottomSheetProps {
  /** 是否打开 */
  open: boolean
  /** 请求关闭（遮罩/抓手下滑/关闭按钮/Esc） */
  onClose: () => void
  /** 面板标题 */
  title?: ReactNode
  /** 面板正文（滚动被锁在面板内部） */
  children: ReactNode
  /** half=约70% 屏高；tall=约88% 屏高（长表单） */
  height?: SheetHeight
  /** 层级：单层 50，在面板上再叠面板 60，确认框 70 */
  zIndex?: number
  /** 点击遮罩是否关闭，默认 true */
  closeOnScrim?: boolean
  /** 底部内容（不随正文滚动，如固定操作按钮） */
  footer?: ReactNode
}

/**
 * 手机端「底部上拉面板」。
 * 设计原则：页面框架固定，临时内容在覆盖层里展开，底层页面 DOM 不重排、不滚动；
 * 滚动条只在面板正文里。支持遮罩点击 / 抓手下滑 / Esc 关闭。
 */
export default function BottomSheet({
  open,
  onClose,
  title,
  children,
  height = 'half',
  zIndex = 50,
  closeOnScrim = true,
  footer,
}: BottomSheetProps) {
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const [mounted, setMounted] = useState(open)
  const [entered, setEntered] = useState(false)
  const [dragY, setDragY] = useState(0)
  const drag = useRef<{ startY: number; active: boolean }>({ startY: 0, active: false })
  // 焦点复位：打开记录触发元素，面板挂载后聚焦；关闭归还
  const dialogRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<Element | null>(null)
  const openRef = useRef(open)
  openRef.current = open

  // 记录触发元素；关闭（open 由 true→false）时归还焦点
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement
      return () => {
        if (!openRef.current && triggerRef.current instanceof HTMLElement) {
          triggerRef.current.focus()
        }
      }
    }
  }, [open])

  // 面板真正挂载后聚焦
  useEffect(() => {
    if (mounted) dialogRef.current?.focus({ preventScroll: true })
  }, [mounted])

  // 挂载/卸载与入场/出场（先以 translateY(100%) 挂载，下一帧再滑入）
  useEffect(() => {
    if (open) {
      setMounted(true)
      setDragY(0)
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)))
      return () => cancelAnimationFrame(raf)
    }
    setEntered(false)
    const t = window.setTimeout(() => setMounted(false), reduceMotion ? 0 : 280)
    return () => window.clearTimeout(t)
  }, [open, reduceMotion])

  // Esc 关闭
  useEffect(() => {
    if (!mounted) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mounted, onClose])

  // 背景锁定滚动（引用计数，支持多层叠加/接替）
  useEffect(() => {
    if (!mounted) return
    lockBodyScroll()
    return unlockBodyScroll
  }, [mounted])

  // 抓手拖拽（pointer 统一鼠标/触摸）：向下拖超过阈值关闭，否则回弹
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    drag.current = { startY: e.clientY, active: true }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return
    const dy = e.clientY - drag.current.startY
    setDragY(dy > 0 ? dy : 0)
  }
  function onPointerUp() {
    if (!drag.current.active) return
    drag.current.active = false
    if (dragY > 110) onClose()
    else setDragY(0)
  }

  if (!mounted) return null

  const EASE = 'cubic-bezier(0.22,1,0.36,1)'
  const scrimOpacity = Math.max(0, 1 - dragY / 520)

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex }}>
      {/* 遮罩 */}
      <div
        aria-hidden
        onClick={() => closeOnScrim && onClose()}
        className={cn('absolute inset-0 bg-black/40', closeOnScrim && 'cursor-pointer')}
        style={{
          opacity: entered ? scrimOpacity : 0,
          transition: reduceMotion ? 'none' : 'opacity 280ms linear',
        }}
      />

      {/* 面板 */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : '上拉面板'}
        className={cn(
          'absolute inset-x-0 bottom-0 mx-auto flex max-w-3xl flex-col rounded-t-2xl border border-b-0 border-border bg-card shadow-2xl',
          height === 'half' ? 'max-h-[70svh]' : 'max-h-[88svh]',
        )}
        style={{
          transform: `translateY(${entered ? dragY : 100}%)`,
          transition: reduceMotion || drag.current.active ? 'none' : `transform 280ms ${EASE}`,
        }}
      >
        {/* 抓手（仅这里可拖拽，避免与正文滚动冲突） */}
        <div
          className="flex h-7 w-full touch-none cursor-grab items-start justify-center pt-2 active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className="h-1.5 w-10 shrink-0 rounded-full bg-border" />
        </div>

        {/* 标题栏 */}
        {title && (
          <div className="flex items-center justify-between gap-2 px-5 pb-2">
            <h2 className="font-display text-lg">{title}</h2>
            <button
              type="button"
              aria-label="关闭"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* 正文（滚动锁在面板内） */}
        <div className="flex-1 overflow-y-auto px-5 pb-7">{children}</div>

        {/* 固定底部操作区（不随正文滚动） */}
        {footer && <div className="border-t border-border px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
