import { useEffect, useState, type JSX } from 'react'
import { getAlbum } from '../../../lib/album'
import type { PhotoStreamItem } from '../../../lib/review/photoStream'

/**
 * 行程回顾 · 照片 Tab 聚合网格：
 * 挂载时一次性读取相册库构建 id → url 映射（alive 标志防止卸载后 setState 泄漏），
 * 3 列等比方块铺满；照片流为空渲染空状态；点击单元格回调对应 photoId。
 */
export default function PhotoGridTab({
  items,
  onOpenPhoto,
}: {
  items: PhotoStreamItem[]
  onOpenPhoto: (photoId: string) => void
}): JSX.Element {
  const [urlMap, setUrlMap] = useState<ReadonlyMap<string, string>>(() => new Map())

  useEffect(() => {
    let alive = true
    getAlbum().then((all) => {
      if (!alive) return
      const map = new Map<string, string>()
      for (const photo of all) map.set(photo.id, photo.url)
      setUrlMap(map)
    })
    return () => {
      alive = false
    }
  }, [])

  if (items.length === 0) {
    return <p data-testid="photo-grid-empty">还没有照片</p>
  }

  return (
    <div
      data-testid="photo-grid"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '16px' }}
    >
      {items.map((item) => {
        const url = urlMap.get(item.photoId)
        return (
          <button
            key={`${item.entryIndex}-${item.photoIndexInEntry}-${item.photoId}`}
            type="button"
            data-testid={`grid-cell-${item.photoId}`}
            onClick={() => onOpenPhoto(item.photoId)}
            style={{
              aspectRatio: '1 / 1',
              borderRadius: '8px',
              padding: 0,
              overflow: 'hidden',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            {url ? (
              <img
                data-testid={`grid-img-${item.photoId}`}
                src={url}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div className="bg-muted animate-pulse" style={{ width: '100%', height: '100%' }} />
            )}
          </button>
        )
      })}
    </div>
  )
}
