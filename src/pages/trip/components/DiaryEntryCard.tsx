import type { JSX } from 'react'
import { Clock } from 'lucide-react'
import { formatEntryDate, resolvePlace } from '../../../lib/review/place'
import type { DiaryEntry } from '../../../types'

interface DiaryEntryCardProps {
  entry: DiaryEntry
  urlMap: ReadonlyMap<string, string>
  onOpenPhoto: (photoId: string) => void
}

/**
 * 行程回顾 · 日记 Tab 单条图文卡片：
 * 时间行（Clock + M月D日 + 可选地点 point）→ 照片行（64×64 等比缩略图，无 url 脉冲占位）→ 正文。
 * 缩略图尺寸固定 64px，不复用 80px 固定尺寸的共享 PhotoThumb。
 */
export function DiaryEntryCard({ entry, urlMap, onOpenPhoto }: DiaryEntryCardProps): JSX.Element {
  const place = resolvePlace(entry.nodeId)

  return (
    <article
      data-testid={`diary-card-${entry.id}`}
      style={{ border: '1px solid #eef0ec', borderRadius: '12px', padding: '11px', marginBottom: '11px' }}
    >
      <div
        className="items-center"
        style={{ fontSize: '10.5px', color: '#98a296', display: 'flex', gap: '5px', marginBottom: '7px' }}
      >
        <Clock size={11} />
        {formatEntryDate(entry.createdAt)}
        {place && (
          <>
            {' · '}
            <span>{place.point}</span>
          </>
        )}
      </div>

      {entry.photoIds.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', margin: '8px 0 2px', overflowX: 'auto' }}>
          {entry.photoIds.map((pid) => {
            const url = urlMap.get(pid)
            return (
              <button
                key={pid}
                type="button"
                data-testid={`diary-photo-${pid}`}
                onClick={() => onOpenPhoto(pid)}
                style={{ width: 64, height: 64, flexShrink: 0, borderRadius: 8, padding: 0, overflow: 'hidden', border: 'none', cursor: 'pointer' }}
              >
                {url ? (
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div className="bg-muted animate-pulse" style={{ width: 64, height: 64, borderRadius: 8 }} />
                )}
              </button>
            )
          })}
        </div>
      )}

      <div style={{ fontSize: '12.5px', lineHeight: 1.6, color: '#3a4a3e' }}>
        {entry.text ? entry.text : <span style={{ color: '#98a296' }}>（仅照片）</span>}
      </div>
    </article>
  )
}
