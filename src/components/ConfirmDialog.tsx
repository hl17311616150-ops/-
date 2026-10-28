import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  /** 危险操作（红色确认按钮），默认 true */
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
  zIndex?: number
}

/**
 * 居中二次确认对话框（警告类覆盖层，区别于 BottomSheet）。
 * 用于删除、清空等不可逆操作的防误触。
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  danger = true,
  onConfirm,
  onCancel,
  zIndex = 70,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<Element | null>(null)

  useEffect(() => {
    if (!open) return
    // 打开：记录触发元素，聚焦进 dialog；关闭：焦点归还触发元素
    triggerRef.current = document.activeElement
    dialogRef.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') onConfirm()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (triggerRef.current instanceof HTMLElement) triggerRef.current.focus()
    }
  }, [open, onCancel, onConfirm])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/40 px-6"
      style={{ zIndex }}
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-xs rounded-xl border border-border bg-card p-5 text-center shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-medium text-foreground">{title}</p>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border border-border bg-muted px-4 py-2 text-sm text-muted-foreground"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={
              danger
                ? 'flex-1 rounded-full bg-destructive px-4 py-2 text-sm text-destructive-foreground'
                : 'flex-1 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground'
            }
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
