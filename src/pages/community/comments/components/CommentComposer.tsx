import { useState, type JSX, type KeyboardEvent } from 'react'

interface CommentComposerProps {
  /** 提交回调：落库成功返回 true（容器清空输入并重算树）；空白被拒返回 false（不清空、不重算） */
  onSend: (text: string) => boolean
}

/**
 * 底部即写即发输入条（Plan 7 · Task 5）：
 * sticky 底部，叠 linear-gradient(0deg,#1c2621 55%,transparent)；
 * 容器白 .08 底、白 .14 边、圆角 999、padding 5px 6px 5px 16px；
 * 表情按钮 #9cc79e 仅视觉无功能；input 13px #f0f3ec、placeholder #7c887e；发送圆 33 #6FA879。
 * 视觉值逐字对齐 task-5-brief.md / comments.html .cm-input。
 */
export default function CommentComposer({ onSend }: CommentComposerProps): JSX.Element {
  const [text, setText] = useState('')

  const handleSend = (): void => {
    const accepted = onSend(text)
    if (accepted) setText('')
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        padding: '11px 16px 16px',
        background: 'linear-gradient(0deg,#1c2621 55%,transparent)',
      }}
    >
      <div
        data-testid="composer"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'rgba(255,255,255,.08)',
          border: '1px solid rgba(255,255,255,.14)',
          borderRadius: 999,
          padding: '5px 6px 5px 16px',
        }}
      >
        <button
          type="button"
          aria-label="表情"
          style={{
            color: '#9cc79e',
            border: 'none',
            background: 'none',
            padding: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            flex: 'none',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
          </svg>
        </button>

        <input
          data-testid="comment-input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="说点什么…"
          aria-label="写评论"
          className="placeholder:text-[#7c887e]"
          style={{
            flex: 1,
            background: 'transparent',
            border: 0,
            outline: 'none',
            fontSize: 13,
            color: '#f0f3ec',
            minWidth: 0,
          }}
        />

        <button
          type="button"
          aria-label="发送"
          data-testid="comment-send"
          onClick={handleSend}
          style={{
            width: 33,
            height: 33,
            borderRadius: '50%',
            background: '#6FA879',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            flex: 'none',
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
