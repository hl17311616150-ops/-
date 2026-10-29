/**
 * 路线输入解析（文字 / 图片，本地模拟）。
 * 纯函数、本地处理，不联网；供 Task 6 路线步骤调用。
 */

/**
 * 分隔符：两字符 `->` 必须排在单字符 `-` 之前，否则会被 `-` 先切开而残留 `>`。
 * `\s+` 一次折叠连续空格 / 换行 / 制表符等空白。
 */
const SEPARATOR_RE = /->|-|—|–|→|到|，|,|、|\s+/g

/**
 * 解析文字路线：按分隔符拆分，去空白、按出现顺序去重（保序）。
 * 非字符串或空输入返回 []，不抛错。
 */
export function parseRouteText(text: string): string[] {
  if (typeof text !== 'string' || text.length === 0) return []

  const seen = new Set<string>()
  const result: string[] = []

  for (const raw of text.split(SEPARATOR_RE)) {
    const token = raw.trim()
    if (token.length === 0 || seen.has(token)) continue
    seen.add(token)
    result.push(token)
  }

  return result
}

// TODO: 真实多模态图片理解（Plan 3+）
/**
 * 图片路线识别（本地模拟）：非空输入返回固定示例路线，空输入返回 []。
 * 当前不接任何真实模型 / 网络。
 */
export function recognizeRouteImage(imageData: string): string[] {
  if (typeof imageData !== 'string' || imageData.length === 0) return []
  return ['长沙', '景德镇', '黟县', '宏村', '呈坎']
}
