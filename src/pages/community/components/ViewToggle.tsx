import type { ReactNode } from 'react'

/**
 * 社区视图切换（Plan 6 · Task 3）：杂志 / 路线两种视图的毛玻璃分段开关。
 * 视觉值逐字对齐 community-redesign.html：容器毛玻璃圆角胶囊，两按钮 30×26，
 * 选中项白底深字 #2f3d33，图标为 14px 内联 SVG。
 */

export type ViewMode = 'magazine' | 'route'

interface ViewToggleProps {
  view: ViewMode
  onChange: (v: ViewMode) => void
}

/** 四宫格（杂志视图）图标，14px */
function MagazineIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

/** 三横线（路线列表视图）图标，14px */
function RouteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  )
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  const options: ReadonlyArray<{ mode: ViewMode; testId: string; label: string; icon: ReactNode }> = [
    { mode: 'magazine', testId: 'toggle-magazine', label: '杂志视图', icon: <MagazineIcon /> },
    { mode: 'route', testId: 'toggle-route', label: '路线视图', icon: <RouteIcon /> },
  ]

  return (
    <div
      data-testid="view-toggle"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        background: 'rgba(255,255,255,.14)',
        border: '1px solid rgba(255,255,255,.3)',
        backdropFilter: 'blur(10px)',
        borderRadius: 999,
        padding: 3,
      }}
    >
      {options.map((option) => {
        const active = view === option.mode
        return (
          <button
            key={option.mode}
            type="button"
            data-testid={option.testId}
            aria-label={option.label}
            aria-pressed={active}
            onClick={() => onChange(option.mode)}
            style={{
              width: 30,
              height: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              borderRadius: 999,
              cursor: 'pointer',
              background: active ? '#fff' : 'transparent',
              color: active ? '#2f3d33' : '#f5f7f3',
              padding: 0,
            }}
          >
            {option.icon}
          </button>
        )
      })}
    </div>
  )
}
