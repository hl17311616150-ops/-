/**
 * 相册库（Album）：所有照片统一存 IndexedDB。
 * - 照片是"内容"而非"配置"，脱离 localStorage 的 ~5MB 配额（base64 原图会写满）。
 * - 统一压缩（长边 1280、JPEG 0.7），单张约 200–400KB。
 * - 日记与照片墙引用同一张照片 id，不重复存储。
 * - 提供 localStoraage 旧照片（travel:v1:photos）一次性迁移。
 */

import type { Visibility } from '../types'

/** 相册库照片记录 */
export interface AlbumPhoto {
  id: string
  tripId: string | null
  /** 照片所属路线节点 id（可选） */
  nodeId: string | null
  /** 压缩后的 dataURL（用于展示） */
  url: string
  /** 缩略图 dataURL（小尺寸，列表用，可选） */
  thumbUrl?: string
  takenAt: number
  createdAt: number
  visibility: Visibility
}

const DB_NAME = 'guiye'
const DB_VERSION = 1
const STORE = 'album'

function uid(prefix: string): string {
  const rand =
    typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto
      ? globalThis.crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${rand}`
}

/** 打开/创建 IndexedDB（单例复用连接） */
let dbPromise: Promise<IDBDatabase> | null = null
function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx<T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const req = op(t.objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

function getAll(): Promise<AlbumPhoto[]> {
  return tx<AlbumPhoto[]>('readonly', (s) => s.getAll() as IDBRequest<AlbumPhoto[]>)
}

/**
 * 压缩图片：绘制到 canvas → 长边缩到 maxSide → 导出 JPEG dataURL（质量 0.7）。
 * 非 canvas 可用的环境（如 jsdom 无真实图像解码）会尽力而为。
 */
export async function getCompressed(src: string, maxSide = 1280): Promise<string> {
  const img = new Image()
  // 加超时兜底：jsdom 不触发 onload、或生产里用户选了无法解码的图时，直接返回原图，不挂起
  await Promise.race([
    new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('图片加载失败'))
      img.src = src
    }),
    new Promise<void>((resolve) => {
      setTimeout(resolve, 1500)
    }),
  ])
  if (img.naturalWidth === 0) return src // 未成功解码：原样返回
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
  if (scale >= 1 && src.startsWith('data:image/jpeg')) return src // 未超限的 JPEG 原样
  const w = Math.max(1, Math.round(img.naturalWidth * scale))
  const h = Math.max(1, Math.round(img.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return src
  ctx.drawImage(img, 0, 0, w, h)
  const out = canvas.toDataURL('image/jpeg', 0.7)
  return out.startsWith('data:') ? out : src
}

/** 从 File 读取 dataURL（jsdom 环境 FileReader 可用） */
function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export interface AddMeta {
  tripId?: string | null
  nodeId?: string | null
  takenAt?: number
}

/** 选图/拍摄 → 压缩 → 入库，返回 AlbumPhoto */
export async function addToAlbum(file: File, meta: AddMeta = {}): Promise<AlbumPhoto> {
  const raw = await fileToDataURL(file)
  const url = await getCompressed(raw)
  const now = Date.now()
  const photo: AlbumPhoto = {
    id: uid('photo'),
    tripId: meta.tripId ?? null,
    nodeId: meta.nodeId ?? null,
    url,
    takenAt: meta.takenAt ?? now,
    createdAt: now,
    visibility: 'self',
  }
  await tx('readwrite', (s) => s.put(photo))
  return photo
}

/**
 * 一次多选入库：过滤非图片文件，逐张压缩入库。
 * 相册/相机一次选多张时使用；坏文件（非 image 类型）跳过不崩。
 */
export async function addManyToAlbum(files: File[] | FileList, meta: AddMeta = {}): Promise<AlbumPhoto[]> {
  const list = Array.from(files).filter((f) => f.type?.startsWith('image/'))
  const out: AlbumPhoto[] = []
  for (const f of list) {
    out.push(await addToAlbum(f, meta))
  }
  return out
}

/** 直接入库一条已构造的照片记录（迁移/测试用） */
export async function putAlbumPhoto(photo: AlbumPhoto): Promise<void> {
  await tx('readwrite', (s) => s.put(photo))
}

export async function getAlbum(): Promise<AlbumPhoto[]> {
  return getAll()
}

export async function getAlbumForTrip(tripId: string): Promise<AlbumPhoto[]> {
  const all = await getAll()
  return all
    .filter((p) => p.tripId === tripId)
    .sort((a, b) => b.takenAt - a.takenAt) // 倒序（最新在前）
}

export async function removeFromAlbum(photoId: string): Promise<void> {
  await tx('readwrite', (s) => s.delete(photoId))
}

/** 测试专用：清空整个相册库 */
export async function clearAlbumForTest(): Promise<void> {
  await openDb().then((db) => {
    return new Promise<void>((resolve, reject) => {
      const t = db.transaction(STORE, 'readwrite')
      t.objectStore(STORE).clear()
      t.oncomplete = () => resolve()
      t.onerror = () => reject(t.error)
    })
  })
}

/**
 * 迁移 localStorage 旧照片（travel:v1:photos，base64 dataURL）进相册库。
 * 旧结构：{ id, destinationId, url, takenAt, visibility } → 转为 AlbumPhoto（tripId=null）。
 */
export async function migrateLegacyPhotos(): Promise<number> {
  const NAMESPACE = 'travel:v1:'
  const key = `${NAMESPACE}photos`
  let raw: string | null = null
  try {
    raw = localStorage.getItem(key)
  } catch {
    return 0
  }
  if (!raw) return 0
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return 0
  }
  if (!Array.isArray(parsed)) return 0
  let migrated = 0
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue
    const id = (item as Record<string, unknown>).id
    const url = (item as Record<string, unknown>).url
    if (typeof id !== 'string' || typeof url !== 'string') continue
    const takenAt = typeof (item as Record<string, unknown>).takenAt === 'number' ? ((item as Record<string, unknown>).takenAt as number) : Date.now()
    await putAlbumPhoto({ id, tripId: null, nodeId: null, url, takenAt, createdAt: takenAt, visibility: 'self' })
    migrated += 1
  }
  try {
    localStorage.removeItem(key)
  } catch {
    /* 忽略 */
  }
  return migrated
}
