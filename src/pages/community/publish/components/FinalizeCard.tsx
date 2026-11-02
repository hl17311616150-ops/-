import type { JSX } from 'react'

interface FinalizeCardProps {
  onSkip: () => void
  onSubmit: () => void
  /** 空选（零日记）时禁用主按钮；不传默认 false，保持既有可点行为 */
  disabled?: boolean
}

/**
 * 底部收尾卡片（Plan 7 · Task 4）：
 * 白 .05 底 / 白 .1 边、圆角 14、padding 13；角标 11px #9cc79e + rgba(110,168,121,.18) 底圆角 999；
 * 「先不发」白 .2 边，「整理并发布」#6FA879 白字，均 12px、圆角 999、padding 9。
 * 视觉值逐字对齐 brief / .ongoing-card。
 */
export default function FinalizeCard({ onSkip, onSubmit, disabled = false }: FinalizeCardProps): JSX.Element {
  return (
    <div
      data-testid="finalize-card"
      style={{
        background: 'rgba(255,255,255,.05)',
        border: '1px solid rgba(255,255,255,.1)',
        borderRadius: 14,
        padding: 13,
        marginTop: 14,
      }}
    >
      <span
        data-testid="finalize-tag"
        style={{
          fontSize: 11,
          color: '#9cc79e',
          background: 'rgba(110,168,121,.18)',
          borderRadius: 999,
          padding: '3px 9px',
          display: 'inline-block',
        }}
      >
        已走完
      </span>
      <div style={{ display: 'flex', gap: 9, marginTop: 11 }}>
        <button
          type="button"
          data-testid="finalize-skip"
          onClick={onSkip}
          style={{
            flex: 1,
            fontSize: 12,
            padding: 9,
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,.2)',
            color: '#eef1ea',
            background: 'none',
            cursor: 'pointer',
          }}
        >
          先不发
        </button>
        <button
          type="button"
          data-testid="finalize-primary"
          onClick={onSubmit}
          disabled={disabled}
          aria-disabled={disabled}
          style={{
            flex: 1,
            fontSize: 12,
            padding: 9,
            borderRadius: 999,
            border: 'none',
            background: '#6FA879',
            color: '#fff',
            fontWeight: 600,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.45 : 1,
          }}
        >
          整理并发布
        </button>
      </div>
    </div>
  )
}
