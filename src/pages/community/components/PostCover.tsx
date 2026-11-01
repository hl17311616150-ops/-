import type { CSSProperties, JSX } from 'react'
import type { CommunityPost } from '../../../data/community'

/** 衬线栈逐字取自 community-detail-dark.html */
const SERIF_STACK = '"Noto Serif SC","Songti SC",serif'

interface PostCoverProps {
  post: CommunityPost
  onBack: () => void
  onToggleSave: () => void
  saved: boolean
  followed: boolean
  onToggleFollow: () => void
}

/** 返回箭头（对齐 mockup c-top 左侧 gc 内 SVG） */
function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

/** 收藏书签：未收藏描边、收藏填充（saved 切换填充态） */
function BookmarkIcon({ saved }: { saved: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={saved ? '#fff' : 'none'} stroke="#fff" strokeWidth="2" aria-hidden="true">
      <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}

/** 分享三点连线（对齐 mockup 右侧第二个 gc 内 SVG） */
function ShareIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  )
}

/** 顶部毛玻璃圆钮共用样式（36px / rgba(255,255,255,.16) / 白边 / blur10） */
const circleStyle: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  background: 'rgba(255,255,255,.16)',
  border: '1px solid rgba(255,255,255,.4)',
  backdropFilter: 'blur(10px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  padding: 0,
  cursor: 'pointer',
}

/**
 * 社区帖子封面（Plan 6 · Task 6）：
 * 300px 风景封面 + 三段深色渐变；顶部返回 / 收藏 / 分享毛玻璃圆钮；
 * 作者头像与关注胶囊、24px 衬线标题、11.5px meta（难度绿色）。
 * 收藏圆与详情 act 栏收藏共用 `saved`；关注胶囊与详情共用 `followed`，均为本地视觉态。
 * 视觉值逐字对齐 community-detail-dark.html。
 */
export default function PostCover({ post, onBack, onToggleSave, saved, followed, onToggleFollow }: PostCoverProps): JSX.Element {
  return (
    <div
      data-testid="post-cover"
      style={{ position: 'relative', height: 300, overflow: 'hidden' }}
    >
      <img
        src={post.cover}
        alt=""
        draggable={false}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg,rgba(16,24,20,.42),rgba(16,24,20,0) 28%,rgba(16,24,20,.85))',
        }}
      />

      {/* 顶部行：左侧返回圆；右侧收藏 + 分享圆 */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          right: 20,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <button type="button" aria-label="返回" data-testid="post-back-btn" onClick={onBack} style={circleStyle}>
          <BackIcon />
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            aria-label={saved ? '取消收藏' : '收藏'}
            data-testid="post-cover-save-btn"
            onClick={onToggleSave}
            style={circleStyle}
          >
            <BookmarkIcon saved={saved} />
          </button>
          <button
            type="button"
            aria-label="分享"
            data-testid="post-share-btn"
            aria-disabled="true"
            style={{ ...circleStyle, cursor: 'default' }}
          >
            <ShareIcon />
          </button>
        </div>
      </div>

      {/* 底部信息区：作者行 + 标题 + meta */}
      <div style={{ position: 'absolute', left: 20, right: 20, bottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 11 }}>
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 12,
              background: post.author.avatarColor,
              flex: 'none',
            }}
          >
            {post.author.avatarChar}
          </span>
          <span style={{ fontSize: 12.5, color: '#f0f3ec', fontWeight: 600 }}>{post.author.name}</span>
          <button
            type="button"
            data-testid="post-follow-btn"
            onClick={onToggleFollow}
            style={{
              marginLeft: 'auto',
              fontSize: 11,
              color: followed ? '#fff' : '#2f3d33',
              background: followed ? '#2f3d33' : '#fff',
              padding: '5px 14px',
              borderRadius: 999,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {followed ? '已关注' : '关注'}
          </button>
        </div>
        <h1
          data-testid="post-title"
          style={{
            fontSize: 24,
            fontFamily: SERIF_STACK,
            color: '#fbfcf8',
            letterSpacing: 1,
            textShadow: '0 2px 10px rgba(0,0,0,.4)',
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {post.title}
        </h1>
        <div style={{ fontSize: 11.5, color: '#d3dbd2', marginTop: 5, display: 'flex', gap: 9, flexWrap: 'wrap' }}>
          <span>{post.dateRangeText}</span>
          <span>·</span>
          <span>
            {post.days}天{post.nights}晚
          </span>
          <span>·</span>
          <span>
            {post.category} {post.distanceKm}km
          </span>
          <span>·</span>
          <span style={{ color: '#9cc79e', fontWeight: 700 }}>{post.difficulty}</span>
        </div>
      </div>
    </div>
  )
}
