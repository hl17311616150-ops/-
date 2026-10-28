import { Compass, Home, MapPin, Route } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '../lib/cn'

const nav = [
  { to: '/', label: '首页', icon: Home, end: true },
  { to: '/recommend', label: '推荐', icon: Compass, end: false },
  { to: '/trip', label: '行程', icon: Route, end: false },
  { to: '/space', label: '空间', icon: MapPin, end: false },
]

export default function Layout() {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col text-foreground">
      <header className="px-6 pt-7 pb-4">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-2xl tracking-wide text-primary">归野</span>
          <span className="text-sm text-muted-foreground">出去走走</span>
        </div>
      </header>

      <main className="flex-1 px-5 pb-24">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs text-muted-foreground transition-colors',
                  isActive && 'text-primary',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2.2 : 1.7} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
