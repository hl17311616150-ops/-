import type { JSX } from 'react'
import type { CommentSort } from '../../../../lib/community/comments'

interface SortRowProps {
  value: CommentSort
  onChange: (sort: CommentSort) => void
}

const SORT_OPTIONS: readonly { key: CommentSort; label: string }[] = [
  { key: 'hot', label: '最热' },
  { key: 'latest', label: '最新' },
]

/**
 * 评论排序行（Plan 7 · Task 5）：
 * padding 4px 16px 10px、gap 18；11.5px #8a9689，选中 #f0f3ec 700；按钮 aria-pressed 受控。
 * 视觉值逐字对齐 task-5-brief.md / comments.html .sort-row。
 */
export default function SortRow({ value, onChange }: SortRowProps): JSX.Element {
  return (
    <div style={{ display: 'flex', gap: 18, padding: '4px 16px 10px' }}>
      {SORT_OPTIONS.map((option) => {
        const pressed = value === option.key
        return (
          <button
            key={option.key}
            type="button"
            data-testid="sort-option"
            aria-pressed={pressed}
            onClick={() => onChange(option.key)}
            style={{
              fontSize: 11.5,
              color: pressed ? '#f0f3ec' : '#8a9689',
              fontWeight: pressed ? 700 : 400,
              border: 'none',
              background: 'none',
              padding: 0,
              cursor: 'pointer',
            }}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
