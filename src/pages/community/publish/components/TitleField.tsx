import type { JSX } from 'react'

/** 衬线栈逐字对齐 PostCover / 简报口径 */
const SERIF_STACK = '"Noto Serif SC","Songti SC",serif'

interface TitleFieldProps {
  value: string
  onChange: (title: string) => void
}

/**
 * 游记标题输入（Plan 7 · Task 4）：
 * 11.5px 灰绿 label；全宽输入框 17px 衬线、白 .06 底 / 白 .12 边、圆角 11。
 * 视觉值逐字对齐 brief / .title-input。
 */
export default function TitleField({ value, onChange }: TitleFieldProps): JSX.Element {
  return (
    <div>
      <label
        htmlFor="publish-title"
        style={{ fontSize: 11.5, color: '#8a9689', margin: '12px 0 7px', letterSpacing: '.5px', display: 'block' }}
      >
        游记标题
      </label>
      <input
        id="publish-title"
        data-testid="title-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          fontSize: 17,
          fontFamily: SERIF_STACK,
          color: '#f0f3ec',
          background: 'rgba(255,255,255,.06)',
          border: '1px solid rgba(255,255,255,.12)',
          borderRadius: 11,
          padding: '11px 13px',
          outline: 'none',
        }}
      />
    </div>
  )
}
