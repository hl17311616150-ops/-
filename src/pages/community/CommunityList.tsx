import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
// Ruling C：命名空间导入，测试方可 vi.spyOn(seed, 'ensureCommunityPhotos') 注入失败
import * as communitySeed from '../../lib/community/communitySeed'
import { getAllPosts } from '../../lib/community/userPosts'
import { filterByCategory } from '../../lib/community/selectors'
import ViewToggle, { type ViewMode } from './components/ViewToggle'
import MagazineView from './components/MagazineView'
import RouteListView from './components/RouteListView'

type Phase = 'loading' | 'error' | 'ready'

/**
 * 社区列表容器（Plan 6 · Task 4，Plan 7 · Task 6 接线）：
 * - 挂载幂等播种社区照片（ensureCommunityPhotos），管理 loading / error / ready 三态，
 *   错误态提供 community-retry 按钮，重试真实重跑同一播种流程；
 * - 管理 view（杂志 / 路线）与分类；数据源为 getAllPosts()（种子帖 + 用户帖合并），
 *   分类经 filterByCategory 计算后作用于合并结果，传给两个视图；
 *   排序 / 难度为路线视图内部状态（只影响路线视图，切换视图不丢数据）；
 * - onOpenPost / onUse 阶段 0 统一跳转帖子详情 `/community/<id>`，真正「用路线」在详情底部按钮；
 * - 右下悬浮「发布游记」入口 navigate('/publish')，不与右上角 ViewToggle 重叠。
 * 深色容器 #1c2621、max-width 480、相对定位；ViewToggle 绝对定位右上。
 */
export default function CommunityList() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('loading')
  const [view, setView] = useState<ViewMode>('magazine')
  const [category, setCategory] = useState('全部')
  const aliveRef = useRef(true)

  /** 播种流程：挂载 effect 与错误态重试按钮共用；失败进入 error，成功进入 ready */
  const load = () => {
    setPhase('loading')
    communitySeed
      .ensureCommunityPhotos()
      .then(() => {
        if (aliveRef.current) setPhase('ready')
      })
      .catch(() => {
        if (aliveRef.current) setPhase('error')
      })
  }

  useEffect(() => {
    aliveRef.current = true
    load()
    return () => {
      aliveRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const posts = getAllPosts()
  const visiblePosts = category === '全部' ? posts : filterByCategory(posts, category)

  const handleOpenPost = (id: string) => {
    navigate(`/community/${id}`)
  }

  const handleUse = (id: string) => {
    navigate(`/community/${id}`)
  }

  return (
    <div
      data-testid="page-community"
      className="mx-auto w-full"
      style={{
        background: '#1c2621',
        maxWidth: 480,
        position: 'relative',
        minHeight: '100svh',
      }}
    >
      {phase === 'loading' && (
        <div
          data-testid="community-loading"
          style={{
            minHeight: '100svh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#8a9689',
            fontSize: 13,
          }}
        >
          正在加载社区内容…
        </div>
      )}

      {phase === 'error' && (
        <div
          data-testid="community-error"
          style={{
            minHeight: '100svh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            padding: 24,
            color: '#8a9689',
            fontSize: 13,
          }}
        >
          <span>社区内容加载失败，请重试</span>
          <button
            type="button"
            data-testid="community-retry"
            onClick={load}
            style={{
              padding: '8px 18px',
              border: '1px solid #6FA879',
              borderRadius: 999,
              background: 'none',
              color: '#eef1ea',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            重试
          </button>
        </div>
      )}

      {phase === 'ready' && (
        <>
          <div style={{ position: 'absolute', top: 18, right: 18, zIndex: 20 }}>
            <ViewToggle view={view} onChange={setView} />
          </div>
          <button
            type="button"
            data-testid="community-publish-entry"
            onClick={() => navigate('/publish')}
            style={{
              position: 'absolute',
              bottom: 24,
              right: 18,
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 16px',
              border: '1px solid #6FA879',
              borderRadius: 999,
              background: 'rgba(28,38,33,.92)',
              color: '#eef1ea',
              fontSize: 12.5,
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(0,0,0,.35)',
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9cc79e"
              strokeWidth="2.6"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            发布游记
          </button>
          {view === 'magazine' ? (
            <MagazineView
              posts={visiblePosts}
              activeCategory={category}
              onCategoryChange={setCategory}
              onOpenPost={handleOpenPost}
            />
          ) : (
            <RouteListView posts={visiblePosts} onOpenPost={handleOpenPost} onUse={handleUse} />
          )}
        </>
      )}
    </div>
  )
}
