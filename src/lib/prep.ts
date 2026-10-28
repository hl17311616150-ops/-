import type { ChecklistItem, Destination } from '../types'
import { createChecklistItem } from '../types'

/**
 * 意图 → 专属准备物品
 * （只做参考；用户可手动增删，见 prepStore）
 */
const INTENT_ITEMS: Record<string, string[]> = {
  登山徒步: ['登山杖', '防滑登山鞋', '保暖层衣物', '应急药品包'],
  探险: ['头灯/急救包', '防风防水外套', '备用电源', '应急口哨'],
  美食: ['肠胃药', '轻便舒适的鞋', '湿巾纸巾', '空杯/保温杯'],
  人文风景: ['舒适的鞋', '相机/手机充电宝', '遮阳帽', '轻便背包'],
  自然: ['防晒霜', '驱蚊用品', '防水装备', '水壶'],
  城市休闲: ['舒适的鞋', '雨伞', '充电宝', '轻便外套'],
}

/**
 * 出发前准备：气候常识打底 + 意图专属物品叠加。
 * 确定性纯函数；返回 source:'auto' 的清单项（仅参考）。
 */
export function generatePrep(
  destination: Destination,
  month: number,
  intent?: string,
): ChecklistItem[] {
  const items: ChecklistItem[] = []
  const climate = destination.climate.perMonth[month]
  if (climate) {
    items.push(createChecklistItem(`参考天气：${month}月 ${climate.high}°/低${climate.low}°，${climate.rain === '多雨' ? '降水偏多' : climate.rain === '干' ? '较干燥' : '雨量适中'}`, destination.id))
    items.push(createChecklistItem(`穿衣建议：${climate.clothing}`, destination.id))
    if (climate.rain === '多雨' || climate.rain === '适中') {
      items.push(createChecklistItem('雨具/雨伞', destination.id))
    }
  }
  if (intent && INTENT_ITEMS[intent]) {
    for (const text of INTENT_ITEMS[intent]) {
      items.push(createChecklistItem(text, destination.id))
    }
  }
  return items
}

export { INTENT_ITEMS }
