/**
 * 应用启动初始化：
 * 1. 逐级跑 schema 迁移到当前版本；
 * 2. 把 localStorage 旧照片一次性迁入 IndexedDB 相册库（幂等）。
 * 照片迁移任何异常都被吞掉、置 0，不得阻塞应用启动（Review Focus #4）。
 */
import { runMigrations } from '../storage/schema'
import { migrateLegacyPhotos } from './album'

export async function bootstrap(): Promise<{ schemaVersion: number; photosMigrated: number }> {
  const schemaVersion = runMigrations()
  let photosMigrated = 0
  try {
    photosMigrated = await migrateLegacyPhotos()
  } catch {
    photosMigrated = 0
  }
  return { schemaVersion, photosMigrated }
}
