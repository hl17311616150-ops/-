import type { DiaryEntry } from '../../types'

/** 照片流一项：单张照片 + 所属日记条目 + 双下标 */
export interface PhotoStreamItem {
  photoId: string
  entry: DiaryEntry
  entryIndex: number
  photoIndexInEntry: number
}

/**
 * 按条目顺序展开 diary 的 photoIds，生成扁平照片流。
 * 同一条目多图共享同一个 entry 引用；photoIds 为空的纯文字条目自然不产生项。
 */
export function buildPhotoStream(entries: DiaryEntry[]): PhotoStreamItem[] {
  const stream: PhotoStreamItem[] = []
  entries.forEach((entry, entryIndex) => {
    entry.photoIds.forEach((photoId, photoIndexInEntry) => {
      stream.push({ photoId, entry, entryIndex, photoIndexInEntry })
    })
  })
  return stream
}
