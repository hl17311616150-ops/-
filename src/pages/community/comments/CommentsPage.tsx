import { useMemo, useState, type JSX } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { addUserComment, buildCommentTree, type CommentSort } from '../../../lib/community/comments'
import type { CommentData } from '../../../lib/community/commentSeed'
import { getAnyPostById } from '../../../lib/community/userPosts'
import CommentsHeader from './components/CommentsHeader'
import SortRow from './components/SortRow'
import CommentItem from './components/CommentItem'
import CommentComposer from './components/CommentComposer'

/** 衬线栈逐字对齐既有社区页面口径 */
const SERIF_STACK = '"Noto Serif SC","Songti SC",serif'

/**
 * 评论区页（Plan 7 · Task 5，路由 /community/:id/comments，无 props）：
 * - useParams 取 postId，getAnyPostById 未命中渲染 comments-not-found 兜底，返回 /community，不白屏；
 * - 命中后 sort 受控（默认 hot），切换重算 buildCommentTree；点赞用组件内 Set<string> 本地态，
 *   已赞计数 +1、aria-pressed=true，不持久化；
 * - 底部 CommentComposer 发送调 addUserComment(postId, text, null)：返回 null（空白）不清空、不重算；
 *   返回评论时清空输入并重算树（新评论按当前排序归入列表）；
 * - 表情按钮仅视觉；作者标只在 isAuthor=true 的评论上渲染。本任务只产出页面元素，路由由 Task 6 挂载。
 */
export default function CommentsPage(): JSX.Element {
  const { id } = useParams()
  const navigate = useNavigate()
  const post = id ? getAnyPostById(id) : undefined

  const [sort, setSort] = useState<CommentSort>('hot')
  /** 本地点赞集合：仅组件内翻转，不持久化、不外发；反复切换计数回到基础值 */
  const [likedIds, setLikedIds] = useState<ReadonlySet<string>>(new Set())
  /** 落库新评论后递增，触发树重算（buildCommentTree 每次读取 localStorage 最新合并结果） */
  const [treeVersion, setTreeVersion] = useState(0)

  const tree = useMemo<{ top: CommentData[]; repliesByParent: Map<string, CommentData[]> }>(() => {
    if (!post) return { top: [], repliesByParent: new Map<string, CommentData[]>() }
    return buildCommentTree(post.id, sort)
  }, [post, sort, treeVersion])

  // 未知 postId 兜底：不白屏、不抛错，返回社区列表
  if (!post) {
    return (
      <div
        data-testid="comments-page"
        style={{ background: '#1c2621', maxWidth: 480, margin: '0 auto', minHeight: '100svh', fontFamily: SERIF_STACK }}
      >
        <div
          data-testid="comments-not-found"
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

  const toggleLike = (commentId: string): void => {
    setLikedIds((prev) => {
      const next = new Set(prev)
      if (next.has(commentId)) next.delete(commentId)
      else next.add(commentId)
      return next
    })
  }

  /** 提交评论：空白被拒返回 false；落库成功递增版本号重算树并返回 true，由输入条清空 */
  const handleSend = (text: string): boolean => {
    const created = addUserComment(post.id, text, null)
    if (!created) return false
    setTreeVersion((prev) => prev + 1)
    return true
  }

  return (
    <div
      data-testid="comments-page"
      style={{
        background: '#1c2621',
        maxWidth: 480,
        margin: '0 auto',
        minHeight: '100svh',
        fontFamily: SERIF_STACK,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CommentsHeader count={post.comments} onBack={() => navigate('/community')} />

      <SortRow value={sort} onChange={setSort} />

      <div style={{ padding: '0 16px 128px', flex: 1 }}>
        {tree.top.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            replies={tree.repliesByParent.get(comment.id) ?? []}
            liked={likedIds.has(comment.id)}
            onToggleLike={toggleLike}
          />
        ))}
      </div>

      <CommentComposer onSend={handleSend} />
    </div>
  )
}
