import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildShareCardData, resolveShareCover, shareThemeFromTokens } from './shareCard'
import type { TripSnapshot } from './snapshot'

vi.mock('../lib/album', () => ({
  getAlbumForTrip: vi.fn(),
  getAlbum: vi.fn(),
}))

import { getAlbum, getAlbumForTrip } from './album'

const mockGetAlbumForTrip = vi.mocked(getAlbumForTrip)
const mockGetAlbum = vi.mocked(getAlbum)

const THEME = { accent: '#33503a', paperBg: '#e9ecdf', paperFg: '#22301f', border: '#d6dcc8' }

function snap(over: Partial<TripSnapshot> = {}): TripSnapshot {
  return {
    tripId: 't1',
    title: '广安 → 四川·成都 → 广安·华蓥山',
    departedAt: 1710000000000,
    totalDays: 3,
    nodes: [
      { key: 'start', type: 'start', label: '广安' },
      { key: 'wp', type: 'waypoint', label: '四川·成都' },
      { key: 'dest', type: 'destination', label: '广安·华蓥山' },
    ],
    diary: [],
    exportedAt: 1710000000000,
    ...over,
  }
}

beforeEach(() => {
  localStorage.clear()
  mockGetAlbumForTrip.mockReset()
  mockGetAlbum.mockReset()
})

describe('分享卡 shareCard', () => {
  it('buildShareCardData：标题/日期/天数正确，封面 URL 透传', () => {
    const data = buildShareCardData(snap(), THEME, 'data:image/jpeg;base64,AAA')
    expect(data.title).toBe('广安 → 四川·成都 → 广安·华蓥山')
    expect(data.departedText).toContain('年')
    expect(data.daysText).toBe('3 天')
    expect(data.coverUrl).toBe('data:image/jpeg;base64,AAA')
    expect(data.placeholderText).toBe('')
    expect(data.accent).toBe('#33503a')
  })

  it('无照片时 coverUrl=null 且占位文案为目的地名', () => {
    const data = buildShareCardData(snap(), THEME, null)
    expect(data.coverUrl).toBeNull()
    expect(data.placeholderText).toBe('广安·华蓥山')
  })

  it('无出发日期时显示"出发日期未定"', () => {
    const data = buildShareCardData(snap({ departedAt: null }), THEME, null)
    expect(data.departedText).toBe('出发日期未定')
  })

  it('改传入快照不影响已生成的 data（数据隔离）', () => {
    const s = snap()
    const data = buildShareCardData(s, THEME, null)
    s.title = '被改的标题'
    s.totalDays = 99
    expect(data.title).toBe('广安 → 四川·成都 → 广安·华蓥山')
    expect(data.daysText).toBe('3 天')
  })

  it('resolveShareCover：优先相册库该行程最新照片', async () => {
    mockGetAlbumForTrip.mockResolvedValue([
      { id: 'p1', tripId: 't1', nodeId: null, url: 'data:image/png;base64,AAA', takenAt: 2, createdAt: 2, visibility: 'self' },
      { id: 'p0', tripId: 't1', nodeId: null, url: 'data:image/png;base64,BB', takenAt: 1, createdAt: 1, visibility: 'self' },
    ])
    mockGetAlbum.mockResolvedValue([])
    const url = await resolveShareCover(snap())
    expect(url).toBe('data:image/png;base64,AAA')
  })

  it('resolveShareCover：相册无该行程照片时回退日记 photoIds', async () => {
    mockGetAlbumForTrip.mockResolvedValue([])
    mockGetAlbum.mockResolvedValue([
      { id: 'photo_x', tripId: 't2', nodeId: null, url: 'data:image/jpeg;base64,CC', takenAt: 1, createdAt: 1, visibility: 'self' },
    ])
    const url = await resolveShareCover(snap({ diary: [{ text: '云海', photoIds: ['photo_x'], nodeId: null, createdAt: 1 }] }))
    expect(url).toBe('data:image/jpeg;base64,CC')
  })

  it('resolveShareCover：都无 → null', async () => {
    mockGetAlbumForTrip.mockResolvedValue([])
    mockGetAlbum.mockResolvedValue([])
    expect(await resolveShareCover(snap())).toBeNull()
  })

  it('shareThemeFromTokens：按 CSS 变量提取配色', () => {
    const t = shareThemeFromTokens({
      '--color-primary': '#1f5363',
      '--color-background': '#dde6e9',
      '--color-foreground': '#1b3135',
      '--color-border': '#c6d4d6',
    })
    expect(t).toEqual({ accent: '#1f5363', paperBg: '#dde6e9', paperFg: '#1b3135', border: '#c6d4d6' })
  })
})
