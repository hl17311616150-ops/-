import type { JSX } from 'react'

interface PublishHeaderProps {
  title: string
  onBack: () => void
  onSubmit: () => void
  /** 空选（零日记）时禁用提交；不传默认 false，保持既有可点行为 */
  disabled?: boolean
}

/**
 * 发布编辑页头部（Plan 7 · Task 4）：
 * 左侧 32px 毛玻璃返回圆、15px 标题、右侧白底胶囊「发布」。
 * 视觉值逐字对齐 task-4-brief.md / publish-flow.html .hd。
 */
export default function PublishHeader({ title, onBack, onSubmit, disabled = false }: PublishHeaderProps): JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
      <button
        type="button"
        aria-label="返回"
        data-testid="publish-back"
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

      <div data-testid="publish-header-title" style={{ fontSize: 15, color: '#f0f3ec', fontWeight: 600 }}>
        {title}
      </div>

      <button
        type="button"
        data-testid="publish-submit-top"
        onClick={onSubmit}
        disabled={disabled}
        aria-disabled={disabled}
        style={{
          marginLeft: 'auto',
          background: '#fff',
          color: '#2f3d33',
          fontSize: 13,
          fontWeight: 700,
          padding: '7px 18px',
          borderRadius: 999,
          border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.45 : 1,
        }}
      >
        发布
      </button>
    </div>
  )
}
