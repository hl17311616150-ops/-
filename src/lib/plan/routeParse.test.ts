import { expect, it } from 'vitest'
import { parseRouteText, recognizeRouteImage } from './routeParse'

it('多种分隔符拆分去重（Review Focus #2）', () => {
  expect(parseRouteText('长沙-景德镇—黟县→宏村,呈坎')).toEqual(['长沙','景德镇','黟县','宏村','呈坎'])
  expect(parseRouteText('长沙 到 景德镇 黟县\n宏村')).toEqual(['长沙','景德镇','黟县','宏村'])
})
it('去空与去重', () => {
  expect(parseRouteText('长沙 - - 景德镇，，')).toEqual(['长沙','景德镇'])
})
it('图片识别本地模拟', () => {
  expect(recognizeRouteImage('data:image/png;base64,xxx')).toContain('长沙')
  expect(recognizeRouteImage('')).toEqual([])
})
