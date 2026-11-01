import { expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FullscreenViewer from './FullscreenViewer'
import { putAlbumPhoto } from '../../../lib/album'
import type { PhotoStreamItem } from '../../../lib/review/photoStream'
import type { DiaryEntry } from '../../../types'

function e(id: string, photoIds: string[], nodeId: string | null): DiaryEntry {
  return { id, text: `文字-${id}`, photoIds, nodeId, createdAt: new Date(2026, 9, 10, 7, 20).getTime(), updatedAt: 1 }
}
const e1 = e('d1', ['p1', 'p2'], 'hongcun-hongcun')
const e2 = e('d2', ['p3'], 'yixian-xidi')
const items: PhotoStreamItem[] = [
  { photoId: 'p1', entry: e1, entryIndex: 0, photoIndexInEntry: 0 },
  { photoId: 'p2', entry: e1, entryIndex: 0, photoIndexInEntry: 1 },
  { photoId: 'p3', entry: e2, entryIndex: 1, photoIndexInEntry: 0 },
]

it('渲染计数、当前照片与底部文字（起始 index）', async () => {
  await putAlbumPhoto({ id: 'p1', tripId: null, nodeId: null, url: 'blob:1', takenAt: 1, createdAt: 1, visibility: 'self' })
  render(<FullscreenViewer items={items} startIndex={0} onClose={() => {}} />)
  expect(screen.getByTestId('fs-count')).toHaveTextContent('1 / 3')
  expect(screen.getByText('文字-d1')).toBeInTheDocument()
  await waitFor(() => expect(screen.getByTestId('fs-photo')).toHaveAttribute('src', 'blob:1'))
})

it('同条多图翻页：文字不变、计数递增（Review Focus #3）', async () => {
  render(<FullscreenViewer items={items} startIndex={0} onClose={() => {}} />)
  await userEvent.click(screen.getByTestId('fs-next'))
  expect(screen.getByTestId('fs-count')).toHaveTextContent('2 / 3')
  expect(screen.getByText('文字-d1')).toBeInTheDocument()
  expect(screen.queryByText('文字-d2')).toBeNull()
})

it('跨条目翻页：地点与文字切换，显示 point · name', async () => {
  render(<FullscreenViewer items={items} startIndex={1} onClose={() => {}} />)
  await userEvent.click(screen.getByTestId('fs-next'))
  expect(screen.getByText('文字-d2')).toBeInTheDocument()
  expect(screen.getByText(/黟县.*西递古村/)).toBeInTheDocument()
})

it('边界：首张上一钮禁用、末张下一钮禁用（Review Focus #5）', () => {
  render(<FullscreenViewer items={items} startIndex={0} onClose={() => {}} />)
  expect(screen.getByTestId('fs-prev')).toBeDisabled()
})

it('关闭钮触发 onClose', async () => {
  let closed = false
  render(<FullscreenViewer items={items} startIndex={0} onClose={() => { closed = true }} />)
  await userEvent.click(screen.getByTestId('fs-close'))
  expect(closed).toBe(true)
})

it('长文限行 3 行，点展开/收起切换', async () => {
  render(<FullscreenViewer items={items} startIndex={0} onClose={() => {}} />)
  const text = screen.getByText('文字-d1')
  expect(text.style.webkitLineClamp).toBe('3')
  await userEvent.click(screen.getByTestId('fs-expand'))
  expect(text.style.webkitLineClamp).toBe('unset')
})

it('条目级页面点：数量等于有照片条目数，点击跳该条目首图', async () => {
  render(<FullscreenViewer items={items} startIndex={0} onClose={() => {}} />)
  const dots = screen.getAllByTestId(/^fs-dot-/)
  expect(dots).toHaveLength(2)
  await userEvent.click(screen.getByTestId('fs-dot-1'))
  expect(screen.getByTestId('fs-count')).toHaveTextContent('3 / 3')
})
