import type { JSX } from 'react'

interface CoverPickerProps {
  cover: string
  onChangeCover: () => void
}

/**
 * 封面选择器（Plan 7 · Task 4）：
 * 150px 高、圆角 15、绝对定位 cover 图 + 底部渐变；左下「更换封面」毛玻璃胶囊，
 * 点击由父级在 COVER_OPTIONS 内循环取下一张。视觉值逐字对齐 brief / .cover-pick。
 */
export default function CoverPicker({ cover, onChangeCover }: CoverPickerProps): JSX.Element {
  return (
    <div
      data-testid="cover-pick"
      style={{ position: 'relative', borderRadius: 15, height: 150, overflow: 'hidden', marginBottom: 13 }}
    >
      <img
        data-testid="cover-img"
        src={cover}
        alt=""
        draggable={false}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(0deg,rgba(10,16,13,.5),transparent 55%)',
        }}
      />
      <button
        type="button"
        data-testid="change-cover"
        onClick={onChangeCover}
        style={{
          position: 'absolute',
          left: 10,
          bottom: 10,
          fontSize: 10.5,
          color: '#fff',
          background: 'rgba(0,0,0,.4)',
          border: '1px solid rgba(255,255,255,.3)',
          padding: '6px 13px',
          borderRadius: 999,
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          cursor: 'pointer',
        }}
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
        更换封面
      </button>
    </div>
  )
}
