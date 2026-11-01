import { expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PhotoGridTab from './PhotoGridTab'
import { putAlbumPhoto } from '../../../lib/album'
import type { PhotoStreamItem } from '../../../lib/review/photoStream'
import type { DiaryEntry } from '../../../types'

const entry: DiaryEntry = { id: 'd1', text: '', photoIds: ['p1', 'p2', 'p3'], nodeId: null, createdAt: 1, updatedAt: 1 }
const items: PhotoStreamItem[] = ['p1', 'p2', 'p3'].map((pid, i) => ({ photoId: pid, entry, entryIndex: 0, photoIndexInEntry: i }))

it('网格为 3 列、gap 8，单元格 1:1、圆角 8', () => {
  render(<PhotoGridTab items={items} onOpenPhoto={() => {}} />)
  const grid = screen.getByTestId('photo-grid')
  expect(grid.style.gridTemplateColumns).toBe('repeat(3, 1fr)')
  expect(grid.style.gap).toBe('8px')
  expect(screen.getByTestId('grid-cell-p1').style.aspectRatio).toBe('1 / 1')
})

it('从 IndexedDB 取 url 渲染图片，点击回调 photoId', async () => {
  await putAlbumPhoto({ id: 'p1', tripId: null, nodeId: null, url: 'blob:x', takenAt: 1, createdAt: 1, visibility: 'self' })
  const open: string[] = []
  render(<PhotoGridTab items={items} onOpenPhoto={(id) => open.push(id)} />)
  await waitFor(() => expect(screen.getByTestId('grid-img-p1')).toHaveAttribute('src', 'blob:x'))
  await userEvent.click(screen.getByTestId('grid-cell-p1'))
  expect(open).toEqual(['p1'])
})

it('空列表显示空状态', () => {
  render(<PhotoGridTab items={[]} onOpenPhoto={() => {}} />)
  expect(screen.getByTestId('photo-grid-empty')).toBeInTheDocument()
})
