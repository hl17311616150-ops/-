import { expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import DailyVerse from './DailyVerse'
import { verseForDate } from '../../../lib/verses'

it('渲染当天诗句与作者', () => {
  const date = new Date(2026, 9, 28)
  render(<DailyVerse date={date} />)
  const v = verseForDate(date)
  const box = screen.getByTestId('daily-verse')
  expect(box).toHaveTextContent(v.text)
  expect(box).toHaveTextContent(v.author)
})

it('同一日期两次渲染内容一致', () => {
  const date = new Date(2026, 9, 28)
  const a = render(<DailyVerse date={date} />).getByTestId('daily-verse').textContent
  cleanup()
  const b = render(<DailyVerse date={date} />).getByTestId('daily-verse').textContent
  expect(a).toBe(b)
})
