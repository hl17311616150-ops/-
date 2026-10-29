import type { TimeAnchor, TimeOfDay } from '../time'

/** 解析结果：出发锚点 + 返程锚点 */
export interface ParsedTime {
  depart: TimeAnchor
  back: TimeAnchor
}

type Action = 'depart' | 'back' | null

interface DateEntry {
  month: number | null
  day: number
  period: TimeOfDay | null
  action: Action
}

/**
 * 时段词表（按词长降序排列，保证最长词优先：
 * “早上”不被单字“早”截断，“中午”不被“午”截断）。
 */
const PERIOD_WORDS: Array<{ word: string; period: TimeOfDay }> = [
  { word: '上午', period: 'morning' },
  { word: '早上', period: 'morning' },
  { word: '早晨', period: 'morning' },
  { word: '清晨', period: 'morning' },
  { word: '下午', period: 'afternoon' },
  { word: '中午', period: 'afternoon' },
  { word: '晚上', period: 'evening' },
  { word: '傍晚', period: 'evening' },
  { word: '黄昏', period: 'evening' },
  { word: '夜里', period: 'evening' },
  { word: '早', period: 'morning' },
  { word: '午', period: 'afternoon' },
  { word: '晚', period: 'evening' },
]

/** 出发动作词 */
const DEPART_WORDS = ['出发', '动身', '走']
/** 返程动作词 */
const BACK_WORDS = ['返程', '回来', '到家', '回']

/** 日期：X月Y号|日，或仅 Y号|日（缺月由调用方补 refMonth） */
const DATE_RE = /(\d{1,2})月(\d{1,2})[号日]|(\d{1,2})[号日]/g

function matchPeriod(segment: string): TimeOfDay | null {
  for (const { word, period } of PERIOD_WORDS) {
    if (segment.includes(word)) return period
  }
  return null
}

function matchAction(segment: string): Action {
  const departPos = DEPART_WORDS.map((w) => segment.indexOf(w)).filter((i) => i >= 0)
  const backPos = BACK_WORDS.map((w) => segment.indexOf(w)).filter((i) => i >= 0)
  if (departPos.length === 0 && backPos.length === 0) return null
  if (departPos.length === 0) return 'back'
  if (backPos.length === 0) return 'depart'
  return Math.min(...departPos) <= Math.min(...backPos) ? 'depart' : 'back'
}

function extractEntries(text: string): DateEntry[] {
  const entries: DateEntry[] = []
  const starts: number[] = []
  const ends: number[] = []

  let m: RegExpExecArray | null
  DATE_RE.lastIndex = 0
  while ((m = DATE_RE.exec(text)) !== null) {
    starts.push(m.index)
    ends.push(m.index + m[0].length)
    const month = m[1] !== undefined ? Number(m[1]) : null
    const day = Number(m[2] ?? m[3])
    entries.push({ month, day, period: null, action: null })
  }

  entries.forEach((entry, i) => {
    // 只取日期之后到下一日期之前的文本，避免带上一条的时段/动作词
    const segStart = ends[i]
    const segEnd = i === entries.length - 1 ? text.length : starts[i + 1]
    const segment = text.slice(segStart, segEnd)
    entry.period = matchPeriod(segment)
    entry.action = matchAction(segment)
  })

  return entries
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * 解析行程起止时间。
 * 日期格式化为 YYYY-MM-DD（月、日本地补零）；缺省时段 depart=morning、back=evening；
 * 凑不齐两个日期时返回 null，不抛错。
 */
export function parseTimeText(
  text: string,
  refYear: number,
  refMonth: number,
): ParsedTime | null {
  if (typeof text !== 'string' || text.length === 0) return null

  const entries = extractEntries(text)
  if (entries.length < 2) return null

  let depart: DateEntry | undefined = entries.find((e) => e.action === 'depart')
  let back: DateEntry | undefined = entries.find((e) => e.action === 'back')
  // 无动作词（或未能成对识别）时，按日期出现先后定 depart / back
  if (!depart || !back) {
    depart = entries[0]
    back = entries[1]
  }

  const toAnchor = (entry: DateEntry, fallback: TimeOfDay): TimeAnchor => {
    const month = entry.month ?? refMonth
    return {
      date: `${refYear}-${pad(month)}-${pad(entry.day)}`,
      period: entry.period ?? fallback,
    }
  }

  return {
    depart: toAnchor(depart, 'morning'),
    back: toAnchor(back, 'evening'),
  }
}
