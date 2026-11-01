import { useState, type JSX } from 'react'
import type { CommentData } from '../../../../lib/community/commentSeed'

interface ReplyListProps {
  /** 父级顶层评论，用于渲染 @父昵称 片段 */
  parent: CommentData
  replies: CommentData[]
}

/** 折叠态默认展示的回复条数 */
const COLLAPSED_COUNT = 2

/**
 * 嵌套回复列表（Plan 7 · Task 5）：
 * 容器白 .04 底、圆角 11；回复行头像 26、昵称 11.5、正文 12；
 * 默认只显示前 2 条，「查看全部 N 条回复」11px #8a9689 可展开 / 收起。
 * 视觉值逐字对齐 task-5-brief.md / comments.html .replies。
 */
export default function ReplyList({ parent, replies }: ReplyListProps): JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? replies : replies.slice(0, COLLAPSED_COUNT)

  return (
    <div style={{ marginTop: 9, background: 'rgba(255,255,255,.04)', borderRadius: 11, padding: '2px 12px' }}>
      {visible.map((reply, index) => (
        <div
          key={reply.id}
          style={{
            display: 'flex',
            gap: 9,
            padding: '9px 0',
            borderBottom: index === visible.length - 1 ? 'none' : '1px solid rgba(255,255,255,.06)',
          }}
        >
          <span
            data-testid="reply-avatar"
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: reply.author.avatarColor,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              flex: 'none',
            }}
          >
            {reply.author.avatarChar}
          </span>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 11.5, color: '#cdd6cd', fontWeight: 600 }}>
              {reply.author.name}
              {reply.isAuthor && (
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
            <div style={{ fontSize: 12, color: '#e4eae1', lineHeight: 1.6, marginTop: 3 }}>
              <span style={{ color: '#98b0a0' }}>@{parent.author.name}</span> {reply.text}
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        data-testid="reply-more"
        onClick={() => setExpanded((prev) => !prev)}
        style={{
          fontSize: 11,
          color: '#8a9689',
          padding: '8px 0',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          display: 'block',
        }}
      >
        {expanded ? '收起回复 ›' : `查看全部 ${replies.length} 条回复 ›`}
      </button>
    </div>
  )
}
