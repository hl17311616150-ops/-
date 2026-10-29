import { VERSES } from '../data/verses'
import type { Verse } from '../data/verses'

export { VERSES }
export type { Verse }

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

export function verseForDate(date: Date): Verse {
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
  return VERSES[hashString(key) % VERSES.length]
}
