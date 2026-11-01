import { useEffect, useRef, useState, type JSX } from 'react'
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

type PostTab = 'diary' | 'photos'

/**
 * 社区帖子详情（Plan 6 · Task 5，路由 /community/:id）：
 * - useParams 取 id 经 getPostById 查找；未找到渲染 post-not-found 兜底，返回按钮 navigate('/community')，
 *   不白屏、不抛未捕获异常；
 * - 找到后挂载 ensureCommunityPhotos() 幂等播种社区照片，再 getAlbum() 建 photoId → url 映射；
 * - 渲染 PostCover + PostRouteCard + 日记 / 照片双 Tab：日记逐条 PostDiaryCard（地点经 resolvePlace
 *   命中才追加 " · 名称"，未命中只显示日期，不虚构地点）；照片复用 PhotoGridTab，流由 buildPhotoStream 展开；
 * - onOpenPhoto 本任务为占位 no-op，全屏联动由 Task 6 接入；收藏态先用本地占位布尔驱动。
 */
export default function PostDetail(): JSX.Element {
  const { id } = useParams()
  const navigate = useNavigate()
  const post = id ? getPostById(id) : undefined

  const [ready, setReady] = useState(false)
  const [urlMap, setUrlMap] = useState<ReadonlyMap<string, string>>(() => new Map())
  const [tab, setTab] = useState<PostTab>('diary')
  /** 收藏占位布尔：本任务只切换本地状态，持久化 / 后端留待后续任务 */
  const [saved, setSaved] = useState(false)
  const aliveRef = useRef(true)

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

  /** TODO(Task 6)：接入全屏照片联动视图；当前为占位 no-op */
  const handleOpenPhoto = (_photoId: string): void => {}

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

  const stream = buildPhotoStream(post.entries)

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
      style={{ background: '#1c2621', maxWidth: 480, margin: '0 auto', minHeight: '100svh' }}
    >
      <PostCover
        post={post}
        onBack={() => navigate('/community')}
        onToggleSave={() => setSaved((prev) => !prev)}
        saved={saved}
      />

      <div style={{ padding: '16px 18px 0' }}>
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
              return <PostDiaryCard key={entry.id} entry={entry} placeText={placeText} urlMap={urlMap} />
            })}
          </div>
        ) : (
          <PhotoGridTab items={stream} onOpenPhoto={handleOpenPhoto} />
        )}
      </div>
    </div>
  )
}
