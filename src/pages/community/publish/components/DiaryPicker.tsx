import type { JSX } from 'react'
import type { DiaryEntry } from '../../../../types'

interface DiaryPickerProps {
  entries: DiaryEntry[]
  selectedIds: string[]
  onToggle: (entryId: string) => void
}

/**
 * 日记勾选列表（Plan 7 · Task 4）：
 * 白 .09 边圆角 11；行 padding 10px 12px、白 .07 分隔；复选框 19px 圆角 6，
 * 选中 #6FA879 底 / 边，role=button + aria-checked；正文 12px #dfe6dc，照片计数 10px #7c887e。
 * 视觉值逐字对齐 brief / .diary-pick。
 */
export default function DiaryPicker({ entries, selectedIds, onToggle }: DiaryPickerProps): JSX.Element {
  return (
    <div
      data-testid="diary-pick"
      style={{ border: '1px solid rgba(255,255,255,.09)', borderRadius: 11, overflow: 'hidden' }}
    >
      {entries.map((entry, index) => {
        const checked = selectedIds.includes(entry.id)
        return (
          <div
            key={entry.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderBottom: index === entries.length - 1 ? 'none' : '1px solid rgba(255,255,255,.07)',
            }}
          >
            <button
              type="button"
              role="button"
              data-testid="diary-check"
              aria-checked={checked}
              aria-label={checked ? '取消公开该日记' : '公开该日记'}
              onClick={() => onToggle(entry.id)}
              style={{
                width: 19,
                height: 19,
                borderRadius: 6,
                flex: 'none',
                border: `1.5px solid ${checked ? '#6FA879' : 'rgba(255,255,255,.35)'}`,
                background: checked ? '#6FA879' : 'transparent',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                cursor: 'pointer',
              }}
            >
              {checked && (
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </button>
            <span
              style={{
                fontSize: 12,
                color: '#dfe6dc',
                minWidth: 0,
                flex: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {entry.text}
            </span>
            <span style={{ fontSize: 10, color: '#7c887e', flex: 'none' }}>{entry.photoIds.length}张</span>
          </div>
        )
      })}
    </div>
  )
}
