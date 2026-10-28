import { ArrowLeft, Compass, House, MapPin, Users } from 'lucide-react'
import { cn } from '../lib/cn'
import SortableList from './SortableList'
import type { SectionId } from '../lib/sections'

const ICONS: Record<SectionId, typeof House> = {
  home: House,
  recommend: Compass,
  space: MapPin,
  community: Users,
}

export const SECTION_LABELS: Record<SectionId, string> = {
  home: '首页',
  recommend: '推荐',
  space: '空间',
  community: '社区',
}

interface RightNavProps {
  order: SectionId[]
  active: SectionId
  canBack: boolean
  onJump: (id: SectionId) => void
  onBack: () => void
  onReorder: (next: SectionId[]) => void
}

/** 右侧悬浮导航：顶部"回到上一页"按钮 + 三个页面切换按钮（点击切换、长按拖动排序） */
export default function RightNav({ order, active, canBack, onJump, onBack, onReorder }: RightNavProps) {
  return (
    <nav className="fixed right-3 top-1/2 z-40 flex -translate-y-1/2 flex-col">
      <button
        type="button"
        onClick={onBack}
        disabled={!canBack}
        aria-label="回到上一页"
        title="回到上一页"
        className={cn(
          'mb-2 flex h-10 w-10 items-center justify-center rounded-full border shadow-sm transition-all',
          canBack
            ? 'border-border bg-card/90 text-foreground hover:bg-muted'
            : 'cursor-not-allowed border-border/60 bg-card/40 text-muted-foreground/40',
        )}
      >
        <ArrowLeft size={18} strokeWidth={2} />
      </button>

      <SortableList
        items={order}
        getKey={(id) => id}
        onReorder={canBack ? () => {} : onReorder}
        handleOnly
        activateDelay={300}
        render={(id) => {
          const Icon = ICONS[id]
          const isActive = id === active
          return (
            <button
              data-drag-handle
              type="button"
              onClick={() => onJump(id)}
              aria-label={SECTION_LABELS[id]}
              aria-current={isActive ? 'true' : undefined}
              title={isActive ? '当前页面' : '点击切换页面 · 长按拖动调整顺序'}
              className={cn(
                'mb-2 flex h-11 w-11 items-center justify-center rounded-full border shadow-sm transition-all',
                canBack ? 'cursor-grab touch-none opacity-100' : 'cursor-grab touch-none active:cursor-grabbing',
                isActive
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card/90 text-muted-foreground hover:text-primary',
              )}
            >
              <Icon size={18} strokeWidth={isActive ? 2.2 : 1.7} />
            </button>
          )
        }}
      />
    </nav>
  )
}
