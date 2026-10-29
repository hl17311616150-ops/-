import type { ReactNode } from 'react'
import { cn } from '../../../lib/cn'

/**
 * 引导聊天气泡：
 * - who='ai'：左对齐，浅色卡片底，靠近头像一侧直角
 * - who='user'：右对齐，品牌实色底、反白文字，靠近自己一侧直角
 */
export function ChatBubble({ who, children }: { who: 'ai' | 'user'; children: ReactNode }) {
  const ai = who === 'ai'
  return (
    <div className={cn('flex w-full', ai ? 'justify-start' : 'justify-end')}>
      <div
        className={cn(
          'max-w-[82%] px-4 py-2.5 text-[15px] leading-relaxed',
          ai
            ? 'rounded-2xl rounded-tl-md border border-border bg-card text-card-foreground shadow-sm'
            : 'rounded-2xl rounded-tr-md bg-primary text-primary-foreground',
        )}
      >
        {children}
      </div>
    </div>
  )
}
