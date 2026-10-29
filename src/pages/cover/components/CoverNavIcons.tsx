import { Compass, User } from 'lucide-react'
import { Link } from 'react-router-dom'

interface CoverNavItem {
  to: string
  label: string
  testId: string
  circleTestId: string
  Icon: typeof Compass
}

const NAV_ITEMS: readonly CoverNavItem[] = [
  { to: '/community', label: '社区', testId: 'nav-community', circleTestId: 'nav-community-circle', Icon: Compass },
  { to: '/profile', label: '我的', testId: 'nav-profile', circleTestId: 'nav-profile-circle', Icon: User },
]

/**
 * 封面右上角导航图标（归野 V4 首页封面 Task 5）：
 * 社区（指南针）→ /community、我的（人像）→ /profile；可见圆 36px、触控热区 44px。
 * 外层 Link 为 44×44 热区（flex 居中），内层毛玻璃圆 36px（白色 16% 底 + 白色 40% 边 + blur10），图标 18px。
 * 定位（右上角）由 Task 8 的 HomeCover 布局负责，本组件只输出并排的两个入口。
 */
export default function CoverNavIcons() {
  return (
    <nav aria-label="封面导航" className="flex items-center gap-2.5">
      {NAV_ITEMS.map(({ to, label, testId, circleTestId, Icon }) => (
        <Link
          key={to}
          to={to}
          aria-label={label}
          data-testid={testId}
          style={{
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          className="text-white no-underline"
        >
          <div
            data-testid={circleTestId}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.16)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={18} strokeWidth={1.8} />
          </div>
        </Link>
      ))}
    </nav>
  )
}
