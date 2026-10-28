/**
 * 数据 schema 版本与迁移机制（v2 上云铺底）。
 * - 命名空间 travel:v1: 之上再加一个 schema 版本标记，数据 shape 变更时可平滑迁移，
 *   而不是让用户数据静默丢失/返工。
 * - 当前 SCHEMA_VERSION=1，无历史数据需迁移，runMigrations() 空转安全（no-op）。
 * - 将来 v2 上云/改字段：registerMigration(from, fn) 注册"从版本 N 迁到 N+1"，再 bump
 *   SCHEMA_VERSION，应用启动时调一次 runMigrations() 即可逐级迁移。
 */
import { load, save } from './store'
import { K } from './keys'

/** 当前数据 schema 版本 */
export const SCHEMA_VERSION = 1

/** 版本标记的存储 key（经 store 的 travel:v1: 前缀拼出 travel:v1:schemaVersion） */
export const SCHEMA_VERSION_KEY = K.schemaVersion

/** 迁移注册表：from 版本 → 迁移到 from+1 的 fn */
const migrations = new Map<number, () => void>()

/** 注册"从 from 版本迁移到 from+1"的迁移函数（幂等：同一 from 只保留最后一个） */
export function registerMigration(from: number, fn: () => void): void {
  migrations.set(from, fn)
}

/** 读取当前数据 schema 版本；无标记视为 SCHEMA_VERSION（无旧版本 = 当前） */
export function getSchemaVersion(): number {
  return load<number>(SCHEMA_VERSION_KEY, SCHEMA_VERSION)
}

/**
 * 逐级执行迁移到 SCHEMA_VERSION；当前版本 ≥ 目标或缺失迁移时 no-op。
 * 返回迁移后的版本号。
 */
export function runMigrations(): number {
  let v = getSchemaVersion()
  while (v < SCHEMA_VERSION) {
    const fn = migrations.get(v)
    if (!fn) break // 缺该级迁移：停在当前版本，不强迁
    fn()
    v++
  }
  if (v !== getSchemaVersion()) save(SCHEMA_VERSION_KEY, v)
  return v
}
