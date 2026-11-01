import type { JSX } from 'react'
import type { CommentData } from '../../../../lib/community/commentSeed'
import ReplyList from './ReplyList'

interface CommentItemProps {
  comment: CommentData
  /** 挂载在该评论下的回复（由容器按 repliesByParent 传入） */
  replies: CommentData[]
  /** 组件内本地点赞态（不持久化） */
  liked: boolean
  onToggleLike: (commentId: string) => void
}

/** 相对时间：分钟 / 小时 / 天 / 月，兜底「刚刚」；仅用于评论 meta 展示 */
function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return '刚刚'
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`
  return `${Math.floor(days / 30)}个月前`
}

/**
 * 顶层评论条目（Plan 7 · Task 5）：
 * flex gap 11、padding 13、白 .07 分隔；头像 34 圆；昵称 12.5px #cdd6cd；
 * 作者标 9.5px #9cc79e + rgba(110,168,121,.16) 底、圆角 6；
 * 正文 13px #e4eae1、行高 1.6；meta 11px #7c887e；点赞 11px，本地态已赞 #9cc79e、aria-pressed、计数 +1。
 * 视觉值逐字对齐 task-5-brief.md / comments.html .cm。
 */
export default function CommentItem({ comment, replies, liked, onToggleLike }: CommentItemProps): JSX.Element {
  return (
    <div style={{ display: 'flex', gap: 11, padding: 13, borderBottom: '1px solid rgba(255,255,255,.07)' }}>
      <span
        data-testid="comment-avatar"
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: comment.author.avatarColor,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          flex: 'none',
        }}
      >
        {comment.author.avatarChar}
      </span>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div>
          <span
            data-testid="comment-name"
            style={{ fontSize: 12.5, color: '#cdd6cd', fontWeight: 600 }}
          >
            {comment.author.name}
          </span>
          {comment.isAuthor && (
            <span
              data-testid="author-badge"
              style={{
                fontSize: 9.5,
                color: '#9cc79e',
                background: 'rgba(110,168,121,.16)',
                padding: '2px 7px',
                borderRadius: 6,
                marginLeft: 7,
                fontWeight: 600,
              }}
            >
              作者
            </span>
          )}
        </div>

        <div
          data-testid="comment-text"
          style={{ fontSize: 13, color: '#e4eae1', lineHeight: 1.6, marginTop: 5 }}
        >
          {comment.text}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, fontSize: 11, color: '#7c887e' }}>
          <span>{relativeTime(comment.createdAt)}</span>
          <span style={{ color: '#8a9689' }}>回复</span>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            data-testid="comment-like"
            aria-pressed={liked}
            onClick={() => onToggleLike(comment.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              border: 'none',
              background: 'none',
              padding: 0,
              cursor: 'pointer',
              fontSize: 11,
              color: liked ? '#9cc79e' : '#7c887e',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill={liked ? '#9cc79e' : 'none'}
              stroke={liked ? '#9cc79e' : '#7c887e'}
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 23l7.7-9.6 1.1-1a5.5 5.5 0 0 0 0-7.8z" />
            </svg>
            <span style={{ fontSize: 10.5 }}>{comment.likes + (liked ? 1 : 0)}</span>
          </button>
        </div>

        {replies.length > 0 && <ReplyList parent={comment} replies={replies} />}
      </div>
    </div>
  )
}
