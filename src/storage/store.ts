/**
 * 本地存储层：localStorage 封装。
 * - 统一命名空间 travel:v1:*（版本化，便于将来迁移）
 * - 损坏/缺失/形状错误数据一律回退 fallback，不抛错、不白屏
 * - save 返回写入是否成功，调用方可按需提示
 */

const NAMESPACE = 'travel:v1:'

function fullKey(key: string): string {
  return `${NAMESPACE}${key}`
}

export function save(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(fullKey(key), JSON.stringify(value))
    return true
  } catch {
    // 写入失败（如配额满、存储被禁用）：不静默吞错，返回 false 供调用方提示
    return false
  }
}

export function load<T>(key: string, fallback: T): T {
  try {
    // getItem 纳入 try：受限环境读取属性本身可能抛 SecurityError
    const raw = localStorage.getItem(fullKey(key))
    if (raw === null) return fallback
    const parsed = JSON.parse(raw)
    if (parsed === null || parsed === undefined) return fallback
    return parsed as T
  } catch {
    return fallback
  }
}

/**
 * 读取列表类数据并做形状守卫：必须是数组，且逐项通过 guard 过滤坏条目。
 * 合法 JSON 但形状错误（如对象/标量）或混入坏条目时，一律回退/过滤，不抛错。
 */
export function loadArray<T>(
  key: string,
  guard: (item: unknown) => item is T,
  fallback: T[] = [],
): T[] {
  const v = load<unknown>(key, fallback)
  if (!Array.isArray(v)) return fallback
  return v.filter(guard)
}

/**
 * 读取对象类数据并做形状守卫：必须是普通对象，且通过 guard 校验关键字段。
 * 失败返回 fallback（默认 null），供调用方判断是否需要重建。
 */
export function loadObject<T extends object>(
  key: string,
  guard: (o: Record<string, unknown>) => boolean,
  fallback: T | null = null,
): T | null {
  const v = load<unknown>(key, fallback)
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return fallback
  if (!guard(v as Record<string, unknown>)) return fallback
  return v as T
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(fullKey(key))
  } catch {
    // 忽略
  }
}
