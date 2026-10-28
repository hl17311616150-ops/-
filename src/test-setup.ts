import '@testing-library/jest-dom/vitest'
// jsdom 无原生 IndexedDB，用 fake-indexeddb 提供相册库存储（照片二进制不占 localStorage 5MB 配额）
import 'fake-indexeddb/auto'
