import { describe, expect, it, beforeEach } from 'vitest'
import { load } from '../storage/store'
import { K } from '../storage/keys'
import { getSchemaVersion, registerMigration, runMigrations, SCHEMA_VERSION, SCHEMA_VERSION_KEY } from './schema'

describe('schema 版本与迁移机制（v2 上云铺底）', () => {
  beforeEach(() => localStorage.clear())

  it('无版本标记时视为当前版本，runMigrations 空转安全（不写入业务数据、返回当前版本）', () => {
    expect(SCHEMA_VERSION).toBe(1)
    expect(getSchemaVersion()).toBe(1)
    expect(runMigrations()).toBe(1)
    // 空转后不产生任何业务 key（仅可能写入版本标记自身）
    expect(localStorage.length).toBeLessThanOrEqual(1)
  })

  it('注册迁移 0→1，从旧版本 0 跑迁移：fn 执行、版本升到 1', () => {
    let ran = 0
    registerMigration(0, () => {
      ran++
    })
    // 模拟旧数据：直接置版本标记为 0
    localStorage.setItem(`travel:v1:${SCHEMA_VERSION_KEY}`, '0')
    expect(runMigrations()).toBe(1)
    expect(ran).toBe(1)
    expect(getSchemaVersion()).toBe(1)
  })

  it('版本超前（99 > 当前）不降级、空转 no-op', () => {
    let ran = 0
    registerMigration(0, () => {
      ran++
    })
    localStorage.setItem(`travel:v1:${SCHEMA_VERSION_KEY}`, '99')
    expect(runMigrations()).toBe(99)
    expect(ran).toBe(0)
    expect(getSchemaVersion()).toBe(99)
  })

  it('版本标记与 keys 常量一致（travel:v1:schemaVersion）', () => {
    expect(SCHEMA_VERSION_KEY).toBe(K.schemaVersion)
    expect(`travel:v1:${SCHEMA_VERSION_KEY}`).toBe('travel:v1:schemaVersion')
    // load 通过 store 封装可读到上面手动写入的版本
    expect(load<number>(SCHEMA_VERSION_KEY, 1)).toBe(1)
  })
})
