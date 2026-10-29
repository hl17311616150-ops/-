import { expect, it } from 'vitest'
import { parseTimeText } from './timeParse'

const R = (text: string) => parseTimeText(text, 2026, 11)

it('"8号上午走、13号晚上回"', () => {
  const r = R('8号上午走、13号晚上回')
  expect(r?.depart).toEqual({ date: '2026-11-08', period: 'morning' })
  expect(r?.back).toEqual({ date: '2026-11-13', period: 'evening' })
})
it('完整"X月Y日"，时段词多样', () => {
  const r = R('11月8日早上出发，11月13日傍晚到家')
  expect(r?.depart.date).toBe('2026-11-08')
  expect(r?.depart.period).toBe('morning')
  expect(r?.back.period).toBe('evening')
})
it('缺时段时默认出发上午、返程晚上（Review Focus #1）', () => {
  const r = R('8号走，13号回')
  expect(r?.depart.period).toBe('morning')
  expect(r?.back.period).toBe('evening')
})
it('只有一个日期返回 null', () => {
  expect(R('8号上午走')).toBeNull()
})
it('下午时段可识别', () => {
  const r = R('8号中午走，13号下午回')
  expect(r?.depart.period).toBe('afternoon')
  expect(r?.back.period).toBe('afternoon')
})
