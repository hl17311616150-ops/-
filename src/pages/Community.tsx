import { useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, Bookmark, Heart, MessageCircle, Radio } from 'lucide-react'
import { cn } from '../lib/cn'
import { getTrip } from '../lib/trip'
import BottomSheet from '../components/BottomSheet'
import PhotoThumb from '../components/PhotoThumb'
import {
  addComment,
  commentCount,
  getCommentsForPost,
  getCommunityPosts,
  getInteractionState,
  getOngoingByTrip,
  togglePostLike,
  togglePostSave,
  type CommunityPost,
} from '../lib/community'

const HOUR = 3_600_000
const DAY = 24 * HOUR

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  if (diff < HOUR) return '刚刚'
  if (diff < DAY) return `${Math.floor(diff / HOUR)} 小时前`
  return `${Math.floor(diff / DAY)} 天前`
}

function Cover({ hue, label }: { hue: number; label: string }) {
  return (
    <div
      aria-hidden
      className="flex h-24 w-full items-end overflow-hidden rounded-md px-3 pb-2"
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 42% 76%), hsl(${hue} 52% 58%))`,
      }}
    >
      <span className="font-display text-base text-white/95 drop-shadow-sm">{label}</span>
    </div>
  )
}

function Avatar({ char, hue }: { char: string; hue: number }) {
  return (
    <span
      aria-hidden
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm text-white"
      style={{ background: `hsl(${hue} 55% 55%)` }}
    >
      {char}
    </span>
  )
}

/** 帖子卡：广场信息流的一项 */
function PostCard({
  post,
  liked,
  saved,
  onOpen,
  onLike,
  onSave,
}: {
  post: CommunityPost
  liked: boolean
  saved: boolean
  onOpen: () => void
  onLike: () => void
  onSave: () => void
}) {
  return (
    <article className="overflow-hidden rounded-lg border border-border bg-card">
      {/* 作者行 */}
      <div className="flex items-center gap-2 px-3 pt-2.5">
        <Avatar char={post.author.avatarChar} hue={post.author.avatarHue} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-medium">{post.author.name}</p>
            {post.type === 'ongoing' && (
              <span className="shrink-0 rounded-full bg-leaf/20 px-1.5 py-0.5 text-[10px] font-medium text-leaf">进行中</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {post.location} · {post.days} 天 · {timeAgo(post.createdAt)}
          </p>
        </div>
      </div>

      {/* 封面 */}
      <button type="button" onClick={onOpen} className="block w-full px-3 pt-2 text-left">
        <Cover hue={post.photoHue} label={post.routeTitle} />
      </button>

      {/* 正文区：点开详情 */}
      <button type="button" onClick={onOpen} className="block w-full px-3 pt-1.5 text-left">
        <p className="line-clamp-1 text-sm text-muted-foreground">{post.diarySummary}</p>
      </button>

      {/* 互动条 */}
      <div className="flex items-center gap-1 px-2 py-1.5">
        <button
          type="button"
          aria-label="点赞"
          onClick={onLike}
          className={cn(
            'flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm transition-colors',
            liked ? 'text-primary' : 'text-muted-foreground hover:bg-muted',
          )}
        >
          <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
          <span>{post.likes + (liked ? 1 : 0)}</span>
        </button>
        <span className="flex items-center gap-1 px-2.5 py-1.5 text-sm text-muted-foreground">
          <MessageCircle size={16} />
          <span>{commentCount(post.id)}</span>
        </span>
        <button
          type="button"
          aria-label="收藏"
          onClick={onSave}
          className={cn(
            'ml-auto flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm transition-colors',
            saved ? 'text-primary' : 'text-muted-foreground hover:bg-muted',
          )}
        >
          <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
          <span>{post.saves + (saved ? 1 : 0)}</span>
        </button>
      </div>
    </article>
  )
}

/** 社区页（第四个主页面）：广场信息流 + 帖子详情（模拟）。 */

/** ongoing 帖详情：聚合 live trip 已发布日记的时间轴（文本 + 照片缩略） */
function OngoingTimeline({ post }: { post: CommunityPost }) {
  const ongoing = post.tripId ? getOngoingByTrip(post.tripId) : null
  const trip = getTrip()
  const entries: typeof trip.diary = []
  if (ongoing && trip.id === ongoing.tripId) {
    for (const id of ongoing.publishedEntryIds) {
      const e = trip.diary.find((x) => x.id === id)
      if (e) entries.push(e)
    }
  }
  if (entries.length === 0) return <p className="mt-2 text-sm leading-relaxed text-foreground">{post.diarySummary}</p>
  return (
    <ol className="mt-3 space-y-3">
      {entries.map((e) => (
        <li key={e.id} className="rounded-lg border border-border bg-card/60 p-3">
          {e.photoIds.length > 0 && (
            <div className="mb-2 flex gap-2 overflow-x-auto">
              {e.photoIds.map((pid) => (
                <PhotoThumb key={pid} photoId={pid} size="lg" />
              ))}
            </div>
          )}
          <p className="text-sm leading-relaxed text-foreground">
            {e.text || <span className="text-muted-foreground">（仅照片）</span>}
          </p>
        </li>
      ))}
    </ol>
  )
}

export default function Community() {
  const [posts] = useState<CommunityPost[]>(() => getCommunityPosts())
  const [interactions, setInteractions] = useState(() => getInteractionState())
  const [opening, setOpening] = useState<CommunityPost | null>(null)
  const [watching, setWatching] = useState(false)
  const [draft, setDraft] = useState('')
  const commentsRef = useRef<HTMLDivElement>(null)

  const refresh = useCallback(() => setInteractions(getInteractionState()), [])

  const sendComment = () => {
    if (!opening) return
    if (addComment(opening.id, draft)) {
      setDraft('')
      refresh()
    }
  }

  const onLike = (id: string) => {
    togglePostLike(id)
    refresh()
  }
  const onSave = (id: string) => {
    togglePostSave(id)
    refresh()
  }

  /** 追更列表 = 用户收藏的 ongoing 帖（订阅动态；收藏的 completed 仍走空间页收藏夹） */
  const watchList = posts.filter((p) => p.type === 'ongoing' && !!interactions[p.id]?.saved)

  /** 复用他人路线：先切回首页（Home 此刻可能未挂载），待其挂载后再广播草稿预填 */
  const importRoute = (post: CommunityPost) => {
    window.dispatchEvent(new CustomEvent('gv:goto', { detail: { section: 'home' } }))
    window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('gv:plan-draft', { detail: { nodes: post.nodes, days: post.days } }),
      )
    }, 150)
  }

  return (
    <div className="flex min-h-full flex-col gap-3 p-4">
      {/* 顶部：示例标注 + 追更入口 */}
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1 rounded-lg border border-dashed border-border bg-card/50 px-4 py-3 text-center text-xs text-muted-foreground">
          社区（示例演示，正式版将接入云端）
        </div>
        <button
          type="button"
          aria-label={`追更${watchList.length > 0 ? `(${watchList.length})` : ''}`}
          onClick={() => setWatching(true)}
          className="flex shrink-0 items-center gap-1 rounded-full bg-leaf/20 px-3 py-2 text-sm font-medium text-leaf hover:bg-leaf/30"
        >
          <Radio size={15} /> 追更{watchList.length > 0 ? `(${watchList.length})` : ''}
        </button>
      </div>

      {/* 追更弹窗：上拉列用户收藏的 ongoing 帖，点进全屏详情 */}
      <BottomSheet open={watching} onClose={() => setWatching(false)} title="追更">
        {watchList.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">还没有追更的行程（收藏进行中的行程即可追更）</p>
        ) : (
          <div className="space-y-2">
            {watchList.map((post) => (
              <button
                key={post.id}
                type="button"
                onClick={() => {
                  setWatching(false)
                  setOpening(post)
                }}
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left"
              >
                <Avatar char={post.author.avatarChar} hue={post.author.avatarHue} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-medium">{post.routeTitle}</p>
                    <span className="shrink-0 rounded-full bg-leaf/20 px-1.5 py-0.5 text-[10px] font-medium text-leaf">进行中</span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{post.diarySummary}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </BottomSheet>

      {/* 广场信息流 */}
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          liked={!!interactions[post.id]?.liked}
          saved={!!interactions[post.id]?.saved}
          onOpen={() => setOpening(post)}
          onLike={() => onLike(post.id)}
          onSave={() => onSave(post.id)}
        />
      ))}

      {/* 帖子详情：全屏覆盖二级页（独立滚动，返回可回，复用按钮常驻底部——修复被遮 bug） */}
      {opening &&
        createPortal(
          <div
            role="dialog"
            aria-label="帖子详情"
            className="fixed inset-0 z-[70] flex flex-col bg-card"
          >
            {/* 顶部栏：返回 */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <button
                type="button"
                aria-label="返回"
                onClick={() => setOpening(null)}
                className="flex items-center gap-1 rounded-full px-2 py-1 text-sm text-muted-foreground hover:bg-muted"
              >
                <ArrowLeft size={18} /> 返回
              </button>
              <span className="font-display text-sm">帖子详情</span>
              <span className="w-12" />
            </div>

            {/* 独立滚动内容区（主页面不跟着滚、不被挤压） */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="flex items-center gap-2">
                <Avatar char={opening.author.avatarChar} hue={opening.author.avatarHue} />
                <div>
                  <p className="text-sm font-medium">{opening.author.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {opening.location} · {opening.days} 天 · {timeAgo(opening.createdAt)}
                  </p>
                </div>
              </div>

              <Cover hue={opening.photoHue} label={opening.routeTitle} />

              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-primary">{opening.routeTitle}</p>
                  {opening.type === 'ongoing' && (
                    <span className="shrink-0 rounded-full bg-leaf/20 px-1.5 py-0.5 text-[10px] font-medium text-leaf">进行中</span>
                  )}
                </div>
                {opening.type === 'ongoing' ? <OngoingTimeline post={opening} /> : <p className="mt-2 text-sm leading-relaxed text-foreground">{opening.diarySummary}</p>}
              </div>

              <div className="mt-4 flex items-center gap-1 border-t border-border pt-3">
                <button
                  type="button"
                  aria-label="点赞"
                  onClick={() => onLike(opening.id)}
                  className={cn(
                    'flex items-center gap-1 rounded-full px-3 py-1.5 text-sm',
                    interactions[opening.id]?.liked ? 'text-primary' : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  <Heart size={16} fill={interactions[opening.id]?.liked ? 'currentColor' : 'none'} />
                  {opening.likes + (interactions[opening.id]?.liked ? 1 : 0)}
                </button>
                <button
                  type="button"
                  aria-label="评论"
                  onClick={() => commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
                >
                  <MessageCircle size={16} />
                  {commentCount(opening.id)}
                </button>
                <button
                  type="button"
                  aria-label="收藏"
                  onClick={() => onSave(opening.id)}
                  className={cn(
                    'flex items-center gap-1 rounded-full px-3 py-1.5 text-sm',
                    interactions[opening.id]?.saved ? 'text-primary' : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  <Bookmark size={16} fill={interactions[opening.id]?.saved ? 'currentColor' : 'none'} />
                  {opening.saves + (interactions[opening.id]?.saved ? 1 : 0)}
                </button>
              </div>

              {/* 评论区（seed + 用户新增，统一评论数口径） */}
              <div ref={commentsRef} className="mt-5 scroll-mt-4 border-t border-border pt-4">
                <p className="text-sm font-medium text-muted-foreground">
                  评论（{commentCount(opening.id)}）
                </p>
                <div className="mt-3 flex flex-col gap-4">
                  {getCommentsForPost(opening.id).map((c) => (
                    <div key={c.id} className="flex gap-2">
                      <Avatar char={c.author.avatarChar} hue={c.author.avatarHue} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium">{c.author.name}</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-foreground">{c.text}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(c.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 底部常驻：评论输入 + 用这条路线规划（同层布局，互不遮挡） */}
            <div className="sticky bottom-0 border-t border-border bg-card/95 px-4 pt-3 pb-3">
              <div className="flex items-center gap-2">
                <input
                  aria-label="写评论"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') sendComment()
                  }}
                  placeholder="写点评论吧…"
                  className="min-w-0 flex-1 rounded-full border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
                <button
                  type="button"
                  aria-label="发送评论"
                  onClick={sendComment}
                  className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  发送
                </button>
              </div>
              <button
                type="button"
                onClick={() => importRoute(opening)}
                className="mt-2 w-full rounded-full border border-primary py-2.5 text-sm font-medium text-primary transition-colors hover:bg-muted"
              >
                用这条路线规划
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
