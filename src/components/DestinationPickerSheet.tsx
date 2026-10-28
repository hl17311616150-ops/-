import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import BottomSheet from './BottomSheet'
import type { Destination } from '../types'

interface DestinationPickerSheetProps {
  open: boolean
  onClose: () => void
  title: string
  /** 已按业务规则过滤好的候选（如排除已选、途经点） */
  destinations: Destination[]
  onPick: (id: string) => void
  /** 单层 50；在加高面板内再叠时传 60 */
  zIndex?: number
  /** 选中后是否关闭面板（途经点连续添加时传 false），默认 true */
  closeOnPick?: boolean
}

/**
 * 目的地选择上拉面板：可滚动列表 + 搜索（当前用内置库，v2 接第三方数据）。
 */
export default function DestinationPickerSheet({
  open,
  onClose,
  title,
  destinations,
  onPick,
  zIndex = 50,
  closeOnPick = true,
}: DestinationPickerSheetProps) {
  const [q, setQ] = useState('')

  const kw = q.trim()
  const list = kw
    ? destinations.filter(
        (d) =>
          d.name.includes(kw) ||
          d.location.includes(kw) ||
          d.typeTags.some((t) => t.includes(kw)),
      )
    : destinations

  function pick(id: string) {
    onPick(id)
    if (closeOnPick) {
      setQ('')
      onClose()
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        setQ('')
        onClose()
      }}
      title={title}
      height="half"
      zIndex={zIndex}
    >
      <div className="sticky top-0 -mx-5 mb-2 bg-card px-5 pb-2 pt-1">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2">
          <Search size={15} className="text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜目的地、城市或玩法"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {list.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">没找到匹配的目的地，换个词试试。</p>
      ) : (
        <div className="flex flex-col gap-1">
          {list.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => pick(d.id)}
              className="flex items-center gap-2 rounded-lg px-2 py-2.5 text-left text-sm transition-colors hover:bg-accent/20"
            >
              <Plus size={15} className="shrink-0 text-leaf" />
              <span className="font-medium">{d.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">{d.location}</span>
            </button>
          ))}
        </div>
      )}
    </BottomSheet>
  )
}
