import { useEffect, useMemo, useRef, useState, type JSX } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getPostById } from '../../lib/community/selectors'
import { ensureCommunityPhotos } from '../../lib/community/communitySeed'
import { getAlbum } from '../../lib/album'
import { buildPhotoStream } from '../../lib/review/photoStream'
import { resolvePlace } from '../../lib/review/place'
import PostCover from './components/PostCover'
import PostRouteCard from './components/PostRouteCard'
import PostDiaryCard from './components/PostDiaryCard'
import PhotoGridTab from '../trip/components/PhotoGridTab'
import FullscreenViewer from '../trip/components/FullscreenViewer'

type PostTab = 'diary' | 'photos'

/**
 * 社区帖子详情（Plan 6 · Task 6，路由 /community/:id）：
 * - useParams 取 id 经 getPostById 查找；未找到渲染 post-not-found 兜底，返回按钮 navigate('/community')，
 *   不白屏、不抛未捕获异常；
 * - 找到后挂载 ensureCommunityPhotos() 幂等播种社区照片，再 getAlbum() 建 photoId → url 映射；
 * - 渲染 PostCover + PostRouteCard + 日记 / 照片双 Tab：日记逐条 PostDiaryCard（地点经 resolvePlace
 *   命中才追加 " · 名称"，未命中只显示日期，不虚构地点）；照片复用 PhotoGridTab，流由 buildPhotoStream 展开；
 * - 点网格照片按 photoId 反查流内下标，打开封板 FullscreenViewer，关闭置回 null；
 * - 点赞 / 收藏 / 关注为本地布尔视觉态（不持久化、不外发），计数在基础值上 ±1，反复切回原值；
 *   封面收藏圆、关注胶囊与详情 act 栏共用同一组状态；底部「用这条路线规划」点击 navigate('/plan')，
 *   不携带路线数据。评论 / 发布不在本任务范围。
 */
export default function PostDetail(): JSX.Element {
  const { id } = useParams()
  const navigate = useNavigate()
  const post = id ? getPostById(id) : undefined

  const [ready, setReady] = useState(false)
  const [urlMap, setUrlMap] = useState<ReadonlyMap<string, string>>(() => new Map())
  const [tab, setTab] = useState<PostTab>('diary')
  /** 点赞 / 收藏 / 关注本地视觉态：仅组件内翻转，不持久化、不发请求；反复切换计数回到基础值 */
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const [followed, setFollowed] = useState(false)
  /** 全屏查看起始下标；null 表示未打开 */
  const [fsStart, setFsStart] = useState<number | null>(null)
  const aliveRef = useRef(true)

  /** 照片流：buildPhotoStream 展开 entries，纯文字条目（photoIds 为空）天然不产生项 */
  const stream = useMemo(() => (post ? buildPhotoStream(post.entries) : []), [post])

  useEffect(() => {
    if (!post) return
    aliveRef.current = true
    ensureCommunityPhotos()
      .then(() => getAlbum())
      .then((all) => {
        if (!aliveRef.current) return
        const map = new Map<string, string>()
        for (const photo of all) map.set(photo.id, photo.url)
        setUrlMap(map)
        setReady(true)
      })
      .catch(() => {
        // 播种 / 读库失败不白屏：以空映射进入就绪态，照片位置展示脉冲占位
        if (aliveRef.current) setReady(true)
      })
    return () => {
      aliveRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post])

  /** 网格点开：photoId 反查照片流下标，命中才打开全屏；纯文字条目不在流中，不会进入此路径 */
  const handleOpenPhoto = (photoId: string): void => {
    const index = stream.findIndex((item) => item.photoId === photoId)
    if (index >= 0) setFsStart(index)
  }

  // 未知 id 兜底：不白屏、不抛错，返回社区列表
  if (!post) {
    return (
      <div
        data-testid="page-post"
        style={{ background: '#1c2621', maxWidth: 480, margin: '0 auto', minHeight: '100svh' }}
      >
        <div
          data-testid="post-not-found"
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
          <span>没有找到这条游记，它可能已被删除</span>
          <button
            type="button"
            data-testid="post-not-found-back"
            onClick={() => navigate('/community')}
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
            返回社区
          </button>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div
        data-testid="page-post"
        style={{ background: '#1c2621', maxWidth: 480, margin: '0 auto', minHeight: '100svh' }}
      >
        <div
          data-testid="post-loading"
          style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a9689', fontSize: 13 }}
        >
          正在加载游记…
        </div>
      </div>
    )
  }

  return (
    <div
      data-testid="page-post"
      style={{ background: '#1c2621', maxWidth: 480, margin: '0 auto', minHeight: '100svh', position: 'relative' }}
    >
      <PostCover
        post={post}
        onBack={() => navigate('/community')}
        onToggleSave={() => setSaved((prev) => !prev)}
        saved={saved}
        followed={followed}
        onToggleFollow={() => setFollowed((prev) => !prev)}
      />

      <div style={{ padding: '16px 18px 128px' }}>
        <PostRouteCard nodes={post.nodes} />

        {/* 日记 / 照片 Tab：激活 #f0f3ec 700 + 2px #6FA879 下划线 */}
        <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid rgba(255,255,255,.1)', marginBottom: 6 }}>
          <button
            type="button"
            data-testid="post-tab-diary"
            onClick={() => setTab('diary')}
            style={{
              fontSize: 13.5,
              padding: '9px 2px',
              color: tab === 'diary' ? '#f0f3ec' : '#8a9689',
              fontWeight: tab === 'diary' ? 700 : 400,
              borderBottom: `2px solid ${tab === 'diary' ? '#6FA879' : 'transparent'}`,
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              background: 'none',
              cursor: 'pointer',
            }}
          >
            日记
          </button>
          <button
            type="button"
            data-testid="post-tab-photos"
            onClick={() => setTab('photos')}
            style={{
              fontSize: 13.5,
              padding: '9px 2px',
              color: tab === 'photos' ? '#f0f3ec' : '#8a9689',
              fontWeight: tab === 'photos' ? 700 : 400,
              borderBottom: `2px solid ${tab === 'photos' ? '#6FA879' : 'transparent'}`,
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              background: 'none',
              cursor: 'pointer',
            }}
          >
            照片 · {stream.length}
          </button>
        </div>

        {tab === 'diary' ? (
          <div>
            {post.entries.map((entry) => {
              // Ruling E：resolvePlace 命中才在日期后追加 " · 名称"；未命中只显示日期，不虚构地点
              const place = resolvePlace(entry.nodeId)
              const placeText = place ? ` · ${place.name}` : ''
              return <PostDiaryCard key={entry.id} entry={entry} placeText={placeText} urlMap={urlMap} onOpenPhoto={handleOpenPhoto} />
            })}
          </div>
        ) : (
          <PhotoGridTab items={stream} onOpenPhoto={handleOpenPhoto} />
        )}

        {/* act 栏：点赞 / 评论 / 收藏，12.5px；激活色 #9cc79e；评论为静态展示，评论发布不在本任务范围 */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            padding: '11px 2px',
            borderTop: '1px solid rgba(255,255,255,.1)',
            fontSize: 12.5,
            color: '#9aa498',
            marginTop: 11,
          }}
        >
          <button
            type="button"
            data-testid="post-like-btn"
            onClick={() => setLiked((prev) => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: 0,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 12.5,
              color: liked ? '#9cc79e' : '#9aa498',
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill={liked ? '#9cc79e' : 'none'}
              stroke={liked ? '#9cc79e' : '#9aa498'}
              strokeWidth="2"
              style={{ verticalAlign: '-2px' }}
              aria-hidden="true"
            >
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 23l7.7-9.6 1.1-1a5.5 5.5 0 0 0 0-7.8z" />
            </svg>
            <span data-testid="post-like-count">{post.likes + (liked ? 1 : 0)}</span>
          </button>

          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: '#9aa498' }}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9aa498"
              strokeWidth="2"
              style={{ verticalAlign: '-2px' }}
              aria-hidden="true"
            >
              <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4L3 21l1.1-9A8.5 8.5 0 1 1 21 11.5z" />
            </svg>
            <span>{post.comments}</span>
          </span>

          <button
            type="button"
            data-testid="post-save-btn"
            onClick={() => setSaved((prev) => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: 0,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 12.5,
              color: saved ? '#9cc79e' : '#9aa498',
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill={saved ? '#9cc79e' : 'none'}
              stroke={saved ? '#9cc79e' : '#9aa498'}
              strokeWidth="2"
              style={{ verticalAlign: '-2px' }}
              aria-hidden="true"
            >
              <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            <span data-testid="post-save-count">{post.collects + (saved ? 1 : 0)}</span>
          </button>
        </div>
      </div>

      {/* 底部渐变遮罩 + 白色胶囊「用这条路线规划」；点击 navigate('/plan')，不携带路线数据 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '12px 18px 18px',
          background: 'linear-gradient(0deg,#1c2621 60%,transparent)',
        }}
      >
        <button
          type="button"
          data-testid="plan-route-btn"
          onClick={() => navigate('/plan')}
          style={{
            width: '100%',
            background: '#fff',
            color: '#2f3d33',
            fontSize: 14,
            fontWeight: 700,
            padding: 13,
            borderRadius: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          用这条路线规划
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: '#6FA879',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </button>
      </div>

      {/* 全屏联动：封板 FullscreenViewer，只读复用；关闭置回 null */}
      {fsStart !== null && <FullscreenViewer items={stream} startIndex={fsStart} onClose={() => setFsStart(null)} />}
    </div>
  )
}
