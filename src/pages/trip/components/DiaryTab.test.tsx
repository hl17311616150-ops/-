import { expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DiaryTab from './DiaryTab'
import type { DiaryEntry } from '../../../types'

function entry(id: string, photoIds: string[], nodeId: string | null = null): DiaryEntry {
  return { id, text: '一段文字', photoIds, nodeId, createdAt: new Date(2026, 9, 10, 7, 20).getTime(), updatedAt: 1 }
}

it('渲染条目：时间、地点、文字，纯文字条目无照片行', () => {
  render(<DiaryTab entries={[entry('d1', [], 'hongcun-hongcun'), entry('d2', ['p1'])]} onOpenPhoto={() => {}} />)
  expect(screen.getByText('10月10日')).toBeInTheDocument()
  expect(screen.getByText('宏村')).toBeInTheDocument()
  expect(screen.getAllByText('一段文字')).toHaveLength(2)
})

it('nodeId 解析不到时不显示地点但不崩', () => {
  render(<DiaryTab entries={[entry('d1', [], 'bad-id')]} onOpenPhoto={() => {}} />)
  expect(screen.queryByText('宏村')).toBeNull()
})

it('点缩略图回调对应 photoId', async () => {
  const open: string[] = []
  render(<DiaryTab entries={[entry('d1', ['p7', 'p8'])]} onOpenPhoto={(id) => open.push(id)} />)
  await userEvent.click(screen.getByTestId('diary-photo-p7'))
  expect(open).toEqual(['p7'])
})

it('多图缩略图锁定 64px：按钮不被 flex 压缩，照片行横向滚动', () => {
  render(<DiaryTab entries={[entry('d1', ['p7', 'p8', 'p9'])]} onOpenPhoto={() => {}} />)
  const photo = screen.getByTestId('diary-photo-p7')
  expect(photo.style.flexShrink).toBe('0')
  expect(photo.style.width).toBe('64px')
  expect(photo.style.height).toBe('64px')
  expect(photo.parentElement?.style.overflowX).toBe('auto')
})

it('空列表显示空状态', () => {
  render(<DiaryTab entries={[]} onOpenPhoto={() => {}} />)
  expect(screen.getByTestId('diary-empty')).toBeInTheDocument()
})
