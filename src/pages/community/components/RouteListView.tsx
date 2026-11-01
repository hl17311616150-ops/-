import { useState } from 'react'
import type { CommunityPost } from '../../../data/community'
import type { Difficulty } from '../../../data/hotRoutes'
import { sortPosts, filterByDifficulty } from '../../../lib/community/selectors'
import type { SortKey } from '../../../lib/community/selectors'

/** 衬线栈逐字取自 community-view-toggle.html */
const SERIF_STACK = '"Noto Serif SC","Songti SC",serif'

type DifficultyFilter = Difficulty | 'all'

interface RouteListViewProps {
  posts: readonly CommunityPost[]
  onOpenPost: (id: string) => void
  onUse: (id: string) => void
}

/** 排序选项：hot=热度、days=天数、distance=里程 */
const SORT_OPTIONS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: 'hot', label: '按热度' },
  { value: 'days', label: '按天数' },
  { value: 'distance', label: '按里程' },
]

/** 难度选项（Ruling H：第三项文案与 value 均为「挑战」） */
const DIFFICULTY_OPTIONS: ReadonlyArray<{ value: DifficultyFilter; label: string }> = [
  { value: 'all', label: '全部难度' },
  { value: '轻松', label: '轻松' },
  { value: '中等', label: '中等' },
  { value: '挑战', label: '挑战' },
]

/** 路线行右侧绿色圆按钮内联箭头 SVG（对齐 mockup use-btn） */
function ArrowIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

/**
 * 社区路线紧凑列表视图（Plan 6 · Task 4）：
 * 头部标题 + 排序/难度 select + 路线行（缩略图、名称、meta、节点省略号、绿色圆按钮）。
 * 排序与难度为视图内本地状态，经 sortPosts / filterByDifficulty 作用于传入的 posts；
 * 分类过滤由容器负责。行主体点击 onOpenPost(id)，use 按钮 stopPropagation 后触发 onUse(id)。
 * 视觉值逐字对齐 community-view-toggle.html。
 */
export default function RouteListView({ posts, onOpenPost, onUse }: RouteListViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>('hot')
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all')

  const visiblePosts = sortPosts(filterByDifficulty(posts, difficulty), sortKey)

  return (
    <div style={{ background: '#1c2621', minHeight: '100%' }}>
      {/* 头部 */}
      <div style={{ padding: '18px 18px 10px' }}>
        <h1
          style={{
            fontSize: 21,
            fontFamily: SERIF_STACK,
            color: '#f0f3ec',
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          路线库
        </h1>
        <p style={{ fontSize: 11, color: '#8a9689', margin: '3px 0 0' }}>328 条可直接复制的路线</p>
      </div>

      {/* 排序 / 难度 select */}
      <div style={{ display: 'flex', gap: 7, padding: '0 18px 12px' }}>
        <select
          aria-label="排序"
          value={sortKey}
          onChange={(event) => setSortKey(event.target.value as SortKey)}
          style={{
            flex: 1,
            fontSize: 11,
            background: 'rgba(255,255,255,.08)',
            border: '1px solid rgba(255,255,255,.16)',
            color: '#dfe6dc',
            borderRadius: 9,
            padding: '7px 9px',
          }}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          aria-label="难度"
          value={difficulty}
          onChange={(event) => setDifficulty(event.target.value as DifficultyFilter)}
          style={{
            flex: 1,
            fontSize: 11,
            background: 'rgba(255,255,255,.08)',
            border: '1px solid rgba(255,255,255,.16)',
            color: '#dfe6dc',
            borderRadius: 9,
            padding: '7px 9px',
          }}
        >
          {DIFFICULTY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* 路线行列表 */}
      <div style={{ padding: '0 18px' }}>
        {visiblePosts.map((post) => (
          <div
            key={post.id}
            data-testid="route-row"
            onClick={() => onOpenPost(post.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              background: 'rgba(255,255,255,.05)',
              border: '1px solid rgba(255,255,255,.09)',
              borderRadius: 14,
              padding: 9,
              marginBottom: 10,
              cursor: 'pointer',
            }}
          >
            <img
              src={post.cover}
              alt=""
              draggable={false}
              style={{ width: 54, height: 54, borderRadius: 10, objectFit: 'cover', flex: 'none' }}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13.5, color: '#eef1ea', fontWeight: 600 }}>{post.title}</div>
              <div style={{ fontSize: 10.5, color: '#9aa498', marginTop: 3, display: 'flex', gap: 7 }}>
                <span>
                  {post.days}天{post.distanceKm > 0 ? ` · ${post.distanceKm}km` : ''} ·
                </span>
                <span style={{ color: '#9cc79e', fontWeight: 700 }}>{post.difficulty}</span>
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: '#7c887e',
                  marginTop: 3,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {post.nodes.join('→')}
              </div>
            </div>
            <button
              type="button"
              data-testid="route-use-btn"
              aria-label="用这条路线"
              onClick={(event) => {
                event.stopPropagation()
                onUse(post.id)
              }}
              style={{
                flex: 'none',
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: '#6FA879',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
            >
              <ArrowIcon />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
