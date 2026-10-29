import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { clearDraft } from '../../../lib/planningDraft'
import type { HomeState } from '../../../lib/homeState'

interface HomeMainButtonProps {
  state: HomeState
}

/**
 * 首页三状态主按钮（归野 V4 首页封面 Task 7）。
 *
 * 位置不变原则：按钮上方是一个固定 44px 高的「状态槽」（position:relative）。
 * - fresh：槽内留空；
 * - draft / generated：hint 绝对定位在槽内贴底（bottom:12px，即距按钮 12px），单行不换行。
 * 无论有无 hint、文案长短，槽高恒为 44px，按钮紧跟槽后，Y 坐标不随状态移动。
 *
 * 按钮：fresh / draft 毛玻璃「开始 / 继续规划行程」→ /plan；
 * generated 白色实心「查看我的行程」→ /trip/:tripId；圆角 999，右侧 22px 圆形箭头。
 * 按钮下方小字（draft / generated）「或开始新的规划」：点击先 clearDraft() 再导航 /plan。
 */
export default function HomeMainButton({ state }: HomeMainButtonProps) {
  const navigate = useNavigate()

  const isGenerated = state.kind === 'generated'
  const hint = state.kind === 'draft' || state.kind === 'generated' ? state.hint : null
  const showStartNew = state.kind !== 'fresh'
  const label =
    state.kind === 'generated'
      ? '查看我的行程'
      : state.kind === 'draft'
        ? '继续规划行程'
        : '开始规划行程'
  const to = state.kind === 'generated' ? `/trip/${state.tripId}` : '/plan'

  const handleStartNew = () => {
    clearDraft()
    navigate('/plan')
  }

  const buttonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '9px',
    padding: '9px 15px 9px 18px',
    borderRadius: 999,
    boxSizing: 'border-box',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '0.5px',
    boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
    ...(isGenerated
      ? {
          backgroundColor: '#fff',
          border: '1px solid #fff',
          color: '#3a4a3e',
        }
      : {
          backgroundColor: 'rgba(255, 255, 255, 0.18)',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          color: '#fff',
        }),
  } as const

  const arrowCircleStyle = {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    ...(isGenerated
      ? { backgroundColor: '#6FA879', color: '#fff' }
      : { backgroundColor: 'rgba(255, 255, 255, 0.85)', color: '#3a4a3e' }),
  } as const

  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* 固定 44px 状态槽：hint 有无都不改变槽高，保证按钮 Y 位置不变 */}
      <div
        data-testid="home-state-slot"
        style={{ position: 'relative', height: '44px', width: '100%' }}
      >
        {hint && (
          <span
            style={{
              position: 'absolute',
              bottom: '12px',
              left: 0,
              right: 0,
              textAlign: 'center',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: '12.5px',
              color: 'rgba(255, 255, 255, 0.78)',
            }}
          >
            {hint}
          </span>
        )}
      </div>

      <Link to={to} data-testid="home-main-button" style={buttonStyle}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={arrowCircleStyle}>
          <ArrowRight size={13} strokeWidth={2} />
        </span>
      </Link>

      {showStartNew && (
        <button
          type="button"
          data-testid="home-start-new"
          onClick={handleStartNew}
          style={{
            marginTop: '11px',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.65)',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
          }}
        >
          或开始新的规划
        </button>
      )}
    </div>
  )
}
