import type { JSX } from 'react'
import { formatEntryDate } from '../../../lib/review/place'
import type { DiaryEntry } from '../../../types'

interface PostDiaryCardProps {
  entry: DiaryEntry
  /** resolvePlace 命中后由 PostDetail 拼好的地点后缀（" · 名称"）；未命中为空串，不虚构地点 */
  placeText: string
  urlMap: ReadonlyMap<string, string>
}

/**
 * 社区帖子日记条目卡（Plan 6 · Task 5）：
 * 深色半透明卡片（边 rgba(255,255,255,.09) / 底 rgba(255,255,255,.04) / 圆角 13 / padding 12）；
 * 时间 10.5px #8a9689；照片 64×64 圆角 9、gap 7；正文 12.5px / 行高 1.65 / #e4eae1。
 * 纯文字条目（photoIds 为空）自然不渲染图；视觉值逐字对齐 community-detail-dark.html .dentry。
 */
export default function PostDiaryCard({ entry, placeText, urlMap }: PostDiaryCardProps): JSX.Element {
  return (
    <article
      style={{
        border: '1px solid rgba(255,255,255,.09)',
        background: 'rgba(255,255,255,.04)',
        borderRadius: 13,
        padding: 12,
        margin: '11px 0',
      }}
    >
      <div style={{ fontSize: 10.5, color: '#8a9689', marginBottom: 8 }}>
        {formatEntryDate(entry.createdAt)}
        {placeText}
      </div>

      {entry.photoIds.length > 0 && (
        <div style={{ display: 'flex', gap: 7, margin: '0 0 9px' }}>
          {entry.photoIds.map((photoId) => {
            const url = urlMap.get(photoId)
            return url ? (
              <img
                key={photoId}
                data-testid="post-diary-img"
                src={url}
                alt=""
                style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 9 }}
              />
            ) : (
              <div
                key={photoId}
                className="bg-muted animate-pulse"
                style={{ width: 64, height: 64, borderRadius: 9, flex: 'none' }}
              />
            )
          })}
        </div>
      )}

      <div style={{ fontSize: 12.5, lineHeight: 1.65, color: '#e4eae1' }}>{entry.text}</div>
    </article>
  )
}
