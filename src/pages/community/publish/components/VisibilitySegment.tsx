import type { JSX } from 'react'
import type { PostVisibility } from '../../../../lib/community/userPosts'

interface VisibilitySegmentProps {
  value: PostVisibility
  onChange: (visibility: PostVisibility) => void
}

const OPTIONS: ReadonlyArray<{ value: PostVisibility; label: string }> = [
  { value: 'public', label: '公开' },
  { value: 'friends', label: '好友' },
  { value: 'self', label: '仅自己' },
]

/**
 * 可见范围三段开关（Plan 7 · Task 4）：
 * 白 .07 底 / 白 .1 边、圆角 12、padding 4；按钮 flex 1、12px、圆角 9，
 * 选中白底 #2f3d33 700。视觉值逐字对齐 brief / .seg。
 */
export default function VisibilitySegment({ value, onChange }: VisibilitySegmentProps): JSX.Element {
  return (
    <div
      data-testid="visibility-segment"
      style={{
        display: 'flex',
        background: 'rgba(255,255,255,.07)',
        border: '1px solid rgba(255,255,255,.1)',
        borderRadius: 12,
        padding: 4,
      }}
    >
      {OPTIONS.map((option) => {
        const active = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            data-testid="visibility-option"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            style={{
              flex: 1,
              fontSize: 12,
              padding: 8,
              borderRadius: 9,
              border: 'none',
              cursor: 'pointer',
              background: active ? '#fff' : 'transparent',
              color: active ? '#2f3d33' : '#9aa498',
              fontWeight: active ? 700 : 400,
            }}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
