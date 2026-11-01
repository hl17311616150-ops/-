import { useEffect, useState, type JSX } from 'react'
import { getAlbum } from '../../../lib/album'
import type { DiaryEntry } from '../../../types'
import { DiaryEntryCard } from './DiaryEntryCard'

/**
 * 行程回顾 · 日记 Tab 容器：
 * 挂载时一次性读取相册库构建 id → url 映射（alive 标志防止卸载后 setState 泄漏），
 * 空条目渲染空状态；非空逐条渲染 DiaryEntryCard，透传 urlMap 与照片点开回调。
 */
export default function DiaryTab({ entries, onOpenPhoto }: { entries: DiaryEntry[]; onOpenPhoto: (photoId: string) => void }): JSX.Element {
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

  if (entries.length === 0) {
    return <p data-testid="diary-empty">还没有日记记录</p>
  }

  return (
    <div style={{ padding: '14px 16px 18px' }}>
      {entries.map((entry) => (
        <DiaryEntryCard key={entry.id} entry={entry} urlMap={urlMap} onOpenPhoto={onOpenPhoto} />
      ))}
    </div>
  )
}
