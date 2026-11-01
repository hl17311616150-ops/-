import type { JSX } from 'react'

interface CommentsHeaderProps {
  /** 头部右侧计数（取帖子 comments 字段） */
  count: number
  onBack: () => void
}

/**
 * 评论区头部（Plan 7 · Task 5）：
 * padding 14px 16px、gap 12；左侧 32px 毛玻璃返回圆（同发布页口径）；
 * 标题 15px #f0f3ec，计数 12px #8a9689。视觉值逐字对齐 task-5-brief.md / comments.html .hd。
 */
export default function CommentsHeader({ count, onBack }: CommentsHeaderProps): JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
      <button
        type="button"
        aria-label="返回"
        data-testid="comments-back"
        onClick={onBack}
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'rgba(255,255,255,.14)',
          border: '1px solid rgba(255,255,255,.3)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          padding: 0,
          cursor: 'pointer',
          flex: 'none',
        }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <div
        data-testid="comments-title"
        style={{ fontSize: 15, color: '#f0f3ec', fontWeight: 600, display: 'flex', alignItems: 'baseline', gap: 6 }}
      >
        评论
        <span style={{ fontSize: 12, color: '#8a9689', fontWeight: 400 }}>{count}</span>
      </div>
    </div>
  )
}
