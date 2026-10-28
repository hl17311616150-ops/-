import { useEffect, useState } from 'react'
import { getAlbum } from '../lib/album'
import { cn } from '../lib/cn'

/** 按 id 从相册库取照片展示（共享：日记面板 / 社区 ongoing 时间轴复用） */
export default function PhotoThumb({ photoId, size = 'md' }: { photoId: string; size?: 'md' | 'lg' }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    getAlbum().then((all) => {
      const p = all.find((x) => x.id === photoId)
      if (alive && p) setUrl(p.url)
    })
    return () => {
      alive = false
    }
  }, [photoId])
  if (!url) return <div className={cn('shrink-0 animate-pulse rounded-md bg-muted', size === 'lg' ? 'h-28 w-28' : 'h-20 w-20')} />
  return <img src={url} alt="照片" className={cn('shrink-0 rounded-md object-cover', size === 'lg' ? 'h-28 w-28' : 'h-20 w-20')} />
}
