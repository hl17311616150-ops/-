import { verseForDate } from '../../../lib/verses'

interface DailyVerseProps {
  date?: Date
}

/**
 * 每日诗句（归野 V4 首页封面 Task 4）：按日期确定性取一句山野诗。
 * 衬线斜体诗句 + 左侧半透明白引号 + 11px 非斜体作者；单行不换行，溢出由父容器控制。
 */
export default function DailyVerse({ date = new Date() }: DailyVerseProps) {
  const verse = verseForDate(date)

  return (
    <div
      data-testid="daily-verse"
      className="mt-[14px] whitespace-nowrap"
      style={{ fontFamily: '"Noto Serif SC","Songti SC",serif' }}
    >
      <span aria-hidden="true" className="text-[13px] not-italic text-white/40">
        「
      </span>
      <span className="text-[13px] italic text-white/90">{verse.text}</span>
      <span className="ml-1.5 text-[11px] not-italic text-white/60">——{verse.author}</span>
    </div>
  )
}
