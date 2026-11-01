import { useState, type JSX } from 'react'
import { Clock } from 'lucide-react'
import { formatEntryDate, resolvePlace } from '../../../lib/review/place'
import type { DiaryEntry } from '../../../types'

interface DiaryEntryCardProps {
  entry: DiaryEntry
  urlMap: ReadonlyMap<string, string>
  onOpenPhoto: (photoId: string) => void
  /** 边走边发回调；不传时不渲染发布按钮，保持 Plan 5 既有行为 */
  onPublishEntry?: (entry: DiaryEntry) => void
}

/**
 * 行程回顾 · 日记 Tab 单条图文卡片：
 * 时间行（Clock + M月D日 + 可选地点 point）→ 照片行（64×64 等比缩略图，无 url 脉冲占位）→ 正文；
 * 传入 onPublishEntry 时正文下渲染「边走边发」按钮（主绿描边、12px、圆角 999），
 * 点击后回调并在卡片内切换为「已发到社区」本地提示态；不传则不渲染、既有行为不变。
 * 缩略图尺寸固定 64px，不复用 80px 固定尺寸的共享 PhotoThumb。
 */
export function DiaryEntryCard({ entry, urlMap, onOpenPhoto, onPublishEntry }: DiaryEntryCardProps): JSX.Element {
  const place = resolvePlace(entry.nodeId)
  const [published, setPublished] = useState(false)

  const handlePublish = (): void => {
    onPublishEntry?.(entry)
    setPublished(true)
  }

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

      {onPublishEntry && (
        published ? (
          <span
            data-testid="ongoing-published"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 9,
              fontSize: 12,
              color: '#6FA879',
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6FA879"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
            已发到社区
          </span>
        ) : (
          <button
            type="button"
            data-testid="ongoing-publish-btn"
            onClick={handlePublish}
            style={{
              marginTop: 9,
              padding: '6px 14px',
              border: '1px solid #6FA879',
              borderRadius: 999,
              background: 'none',
              color: '#6FA879',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            边走边发
          </button>
        )
      )}
    </article>
  )
}
