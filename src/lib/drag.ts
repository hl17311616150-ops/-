/** 拖拽排序：把 from 处的项移到 to 处，其余顺移；边界/同位置返回原数组 */
export function dragReorder<T>(items: readonly T[], from: number, to: number): T[] {
  if (from === to) return [...items]
  if (from < 0 || to < 0 || from >= items.length || to >= items.length) return [...items]
  const next = [...items]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}
