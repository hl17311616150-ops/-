import { useEffect, useState } from 'react'
import { Mountain } from 'lucide-react'
import wallpaper from '../../assets/home/wallpaper.jpg'
import { getHomeState } from '../../lib/homeState'
import DailyVerse from './components/DailyVerse'
import CoverNavIcons from './components/CoverNavIcons'
import HotRouteStack from './components/HotRouteStack'
import HomeMainButton from './components/HomeMainButton'

const SERIF_STACK = '"Noto Serif SC","Songti SC",serif'

/**
 * 归野 V4 首页封面（Task 8 组装）：
 * 全屏山湖壁纸 + 上下渐变 scrim；左上角品牌、右上角导航；衬线大标题、每日诗句、功能说明、
 * 三状态主按钮；底部「今日热门线路」倒梯形卡片栈。
 *
 * 裁决（spec §6.1 午夜自动切换）：应用长时间保持打开时，跨午夜也要自动换当天诗句。
 * 维护一个 `today` 状态：useEffect 计算到下一个本地午夜的毫秒数，setTimeout 到点后更新
 * `today` 并重新排程；卸载时清理定时器。测试不推进定时器，不影响用例。
 */
export default function HomeCover() {
  const [today, setToday] = useState(() => new Date())

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    const schedule = () => {
      const now = new Date()
      const nextMidnight = new Date(now)
      nextMidnight.setHours(24, 0, 0, 0)
      const msUntilMidnight = nextMidnight.getTime() - now.getTime()
      timer = setTimeout(() => {
        setToday(new Date())
        schedule()
      }, msUntilMidnight)
    }

    schedule()
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      data-testid="page-home"
      className="relative mx-auto h-[100svh] w-full max-w-[480px] overflow-hidden"
    >
      {/* 全屏壁纸 */}
      <img
        src={wallpaper}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      {/* 上下渐变压暗 scrim：顶部压品牌/标题、中部透壁纸、底部压卡片栈 */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(180deg,rgba(20,28,24,.32),rgba(20,28,24,0) 48%,rgba(16,24,20,.55))',
        }}
      />

      {/* 顶部内容区 */}
      <div className="absolute left-6 right-6 top-6">
        {/* 第一行：品牌 + 右上角导航 */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-1.5 text-white">
            <Mountain size={21} strokeWidth={1.8} />
            <span
              style={{
                fontSize: '16px',
                letterSpacing: '5px',
                fontWeight: 600,
                lineHeight: 1,
              }}
            >
              归野
            </span>
          </div>
          <CoverNavIcons />
        </div>

        {/* 衬线大标题 */}
        <div style={{ marginTop: '18px', fontFamily: SERIF_STACK }} className="text-white">
          <p style={{ fontSize: '34px', fontWeight: 700, lineHeight: 1.25, margin: 0 }}>归山野，</p>
          <p style={{ fontSize: '34px', fontWeight: 500, lineHeight: 1.25, margin: 0 }}>见自己</p>
        </div>

        {/* 每日诗句（按 today 取句，跨午夜自动切换） */}
        <DailyVerse date={today} />

        {/* 功能说明 */}
        <p
          style={{
            marginTop: '12px',
            fontSize: '11.5px',
            maxWidth: '270px',
            lineHeight: 1.7,
            color: 'rgba(255,255,255,0.72)',
            marginBottom: 0,
          }}
        >
          AI 行程规划师，帮你安排每日景点、路线与住宿，说出时间与目的地即可。
        </p>

        {/* 三状态主按钮 */}
        <HomeMainButton state={getHomeState()} />
      </div>

      {/* 底部热门线路 */}
      <div className="absolute bottom-4 left-6 right-4">
        <p
          style={{
            fontSize: '12px',
            letterSpacing: '2px',
            color: 'rgba(255,255,255,0.8)',
            margin: '0 0 10px',
          }}
        >
          今日热门线路
        </p>
        <HotRouteStack />
      </div>
    </div>
  )
}
