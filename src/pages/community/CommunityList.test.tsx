import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CommunityList from './CommunityList'
import { AppRoutes } from '../../App'
import { COMMUNITY_POSTS } from '../../data/community'
import { getAllPosts, publishEntryToOngoing } from '../../lib/community/userPosts'
import { getTrip } from '../../lib/trip'
import type { DiaryEntry } from '../../types'

beforeEach(() => {
  localStorage.clear()
})

it('挂载幂等播种并默认显示杂志视图，可切到路线视图', async () => {
  render(
    <MemoryRouter>
      <CommunityList />
    </MemoryRouter>,
  )
  await waitFor(() => expect(screen.getByTestId('mag-banner')).toBeInTheDocument())
  fireEvent.click(screen.getByTestId('toggle-route'))
  expect(await screen.findAllByTestId('route-row')).toHaveLength(COMMUNITY_POSTS.length)
})
it('播种 reject 时显示错误态并可重试成功', async () => {
  // CommunityList 以 import * as 命名空间方式调用（见 Step 3），故 spy 对 named export 生效
  const seed = await import('../../lib/community/communitySeed')
  vi.spyOn(seed, 'ensureCommunityPhotos').mockRejectedValueOnce(new Error('idb fail')).mockResolvedValueOnce()
  render(
    <MemoryRouter>
      <CommunityList />
    </MemoryRouter>,
  )
  expect(await screen.findByTestId('community-error')).toBeInTheDocument()
  fireEvent.click(screen.getByTestId('community-retry'))
  await waitFor(() => expect(screen.getByTestId('mag-banner')).toBeInTheDocument())
})
it('分类筛选只影响当前视图数据且切换视图不丢数据', async () => {
  render(
    <MemoryRouter>
      <CommunityList />
    </MemoryRouter>,
  )
  await waitFor(() => expect(screen.getByTestId('mag-banner')).toBeInTheDocument())
  fireEvent.click(screen.getByTestId('chip-自驾'))
  fireEvent.click(screen.getByTestId('toggle-route'))
  expect((await screen.findAllByTestId('route-row')).length).toBeGreaterThan(0)
})

it('社区列表有发布入口，点击进入 /publish；列表数据来自 getAllPosts（含用户帖）', async () => {
  // 先落一条用户 ongoing 帖，验证种子帖 + 用户帖的合并结果进入列表
  const entry: DiaryEntry = { id: 'seed_entry_x', text: '边走边发', photoIds: [], nodeId: null, createdAt: Date.now(), updatedAt: Date.now() }
  publishEntryToOngoing(getTrip(), entry)

  render(<MemoryRouter initialEntries={['/community']}><AppRoutes /></MemoryRouter>)
  await waitFor(() => expect(screen.getByTestId('mag-banner')).toBeInTheDocument())

  fireEvent.click(screen.getByTestId('toggle-route'))
  expect(await screen.findAllByTestId('route-row')).toHaveLength(getAllPosts().length)

  fireEvent.click(screen.getByTestId('community-publish-entry'))
  expect(await screen.findByTestId('publish-page')).toBeInTheDocument()
})
