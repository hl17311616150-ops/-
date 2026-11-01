import { expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MagazineView from './MagazineView'
import { COMMUNITY_POSTS } from '../../../data/community'

it('banner 高 268、标题 29px 衬线', () => {
  render(<MagazineView posts={COMMUNITY_POSTS} activeCategory="全部" onCategoryChange={vi.fn()} onOpenPost={vi.fn()} />)
  expect(screen.getByTestId('mag-banner').style.height).toBe('268px')
  expect(screen.getByTestId('mag-title').style.fontSize).toBe('29px')
})

it('编辑精选大卡高 178、圆角 18；热门两列小卡高 150、圆角 16', () => {
  render(<MagazineView posts={COMMUNITY_POSTS} activeCategory="全部" onCategoryChange={vi.fn()} onOpenPost={vi.fn()} />)
  const big = screen.getByTestId('mag-big-card')
  expect(big.style.height).toBe('178px'); expect(big.style.borderRadius).toBe('18px')
  const mini = screen.getAllByTestId('mag-mini-card')
  expect(mini).toHaveLength(2)
  expect(mini[0].style.height).toBe('150px'); expect(mini[0].style.borderRadius).toBe('16px')
})

it('点任一卡片调用 onOpenPost 且传入该帖子 id', () => {
  const onOpen = vi.fn()
  render(<MagazineView posts={COMMUNITY_POSTS} activeCategory="全部" onCategoryChange={vi.fn()} onOpenPost={onOpen} />)
  fireEvent.click(screen.getByTestId('mag-big-card'))
  expect(onOpen).toHaveBeenCalledWith(COMMUNITY_POSTS.find((p) => p.featured)?.id)
})

it('分类 chips 点击触发 onCategoryChange', () => {
  const onCat = vi.fn()
  render(<MagazineView posts={COMMUNITY_POSTS} activeCategory="全部" onCategoryChange={onCat} onOpenPost={vi.fn()} />)
  fireEvent.click(screen.getByTestId('chip-自驾'))
  expect(onCat).toHaveBeenCalledWith('自驾')
})
