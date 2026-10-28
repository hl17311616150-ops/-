/**
 * 社区分享 · 分享卡片（单张图片卡，canvas 合成，零后端）。
 * - 复用 v1.15 的 TripSnapshot 不可变快照，数据隔离：改 live 行程/日记不影响已导出卡。
 * - 封面：优先相册库该行程最新照片，其次日记首条 photoIds；无照片 → 目的地名占位。
 * - 输出 1080×1350（4:5）竖版，手账配色 + "归野"角标；下载为 PNG。
 */
import { getAlbum, getAlbumForTrip } from './album'
import type { TripSnapshot } from './snapshot'

export interface ShareTheme {
  accent: string
  paperBg: string
  paperFg: string
  border: string
}

export interface ShareCardData {
  title: string
  departedText: string
  daysText: string
  /** 封面照片 dataURL；无照片时为 null */
  coverUrl: string | null
  /** 无照片时的占位文案（目的地名） */
  placeholderText: string
  accent: string
  paperBg: string
  paperFg: string
  border: string
}

/** 由主题 tokens 提取分享卡配色（UI 从当前主题取） */
export function shareThemeFromTokens(tokens: Record<string, string>): ShareTheme {
  return {
    accent: tokens['--color-primary'] ?? '#33503a',
    paperBg: tokens['--color-background'] ?? '#e9ecdf',
    paperFg: tokens['--color-foreground'] ?? '#22301f',
    border: tokens['--color-border'] ?? '#d6dcc8',
  }
}

/** 取快照的目的地名（最后一个 destination 节点 label，用于占位） */
function destName(snap: TripSnapshot): string {
  const d = [...snap.nodes].reverse().find((n) => n.type === 'destination')
  return d?.label ?? snap.title ?? '未命名'
}

function fmtDeparted(ms: number | null): string {
  if (!ms) return '出发日期未定'
  const d = new Date(ms)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日出发`
}

/**
 * 组装分享卡数据（纯函数，无 DOM）。
 * @param coverUrl 封面照片 dataURL；无照片传 null（resolveShareCover 提供）
 */
export function buildShareCardData(
  snap: TripSnapshot,
  theme: ShareTheme,
  coverUrl: string | null,
): ShareCardData {
  return {
    title: snap.title,
    departedText: fmtDeparted(snap.departedAt),
    daysText: `${snap.totalDays} 天`,
    coverUrl,
    placeholderText: coverUrl ? '' : destName(snap),
    accent: theme.accent,
    paperBg: theme.paperBg,
    paperFg: theme.paperFg,
    border: theme.border,
  }
}

/**
 * 解析封面照片：优先相册库该行程最新一张，其次日记首条照片 id 反查相册；
 * 都无 → null（占位由 buildShareCardData 生成）。
 */
export async function resolveShareCover(snap: TripSnapshot): Promise<string | null> {
  const albumForTrip = await getAlbumForTrip(snap.tripId)
  if (albumForTrip.length > 0) return albumForTrip[0].url
  const all = await getAlbum()
  for (const photoId of snap.diary[0]?.photoIds ?? []) {
    const ph = all.find((x) => x.id === photoId)
    if (ph) return ph.url
  }
  return null
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = src
  })
}

/** 封面 cover 裁剪绘制（保持比例，居中填满） */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, W: number, H: number) {
  const iw = img.naturalWidth || 1
  const ih = img.naturalHeight || 1
  const scale = Math.max(W / iw, H / ih)
  const dw = iw * scale
  const dh = ih * scale
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh)
}

/** 计算文本按给定宽度会占几行（仅测量，不落字） */
function countLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): number {
  if (!text) return 1
  let lines = 1
  let line = ''
  for (const c of text) {
    const test = line + c
    if (ctx.measureText(test).width > maxWidth && line) {
      lines += 1
      line = c
    } else {
      line = test
    }
  }
  return lines
}

/** 渲染 1080×1350（4:5）竖版分享卡（封面需等待图片解码，故为 async） */
export async function renderShareCardCanvas(data: ShareCardData): Promise<HTMLCanvasElement> {
  const W = 1080
  const H = 1350
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  // 纸感底色
  ctx.fillStyle = data.paperBg
  ctx.fillRect(0, 0, W, H)

  // 封面区（顶部 ~60%）
  const coverH = 820
  if (data.coverUrl) {
    try {
      const img = await loadImage(data.coverUrl)
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, W, coverH)
      ctx.clip()
      drawCover(ctx, img, W, coverH)
      ctx.restore()
    } catch {
      // 封面图加载失败 → 降级占位
      const g = ctx.createLinearGradient(0, 0, W, coverH)
      g.addColorStop(0, data.accent)
      g.addColorStop(1, data.paperBg)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, coverH)
    }
  } else {
    const g = ctx.createLinearGradient(0, 0, W, coverH)
    g.addColorStop(0, data.accent)
    g.addColorStop(1, data.paperBg)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, coverH)
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.font = 'bold 64px "Noto Serif SC", "Songti SC", serif'
    ctx.textAlign = 'center'
    ctx.fillText(data.placeholderText, W / 2, coverH - 120)
  }

  // 品牌角标
  ctx.fillStyle = data.accent
  ctx.beginPath()
  ctx.arc(W / 2, 128, 44, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = data.paperBg
  ctx.font = '28px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('归野', W / 2, 141)
  ctx.font = '20px sans-serif'
  ctx.fillText('出去走走', W / 2, 190)

  // 正文区
  const textTop = 880
  const maxW = W - 180
  ctx.font = 'bold 66px "Noto Serif SC", "Songti SC", serif'
  const titleLines = countLines(ctx, data.title, maxW)
  // 画标题（自动换行）
  ctx.textAlign = 'left'
  ctx.fillStyle = data.paperFg
  let y = textTop
  let line = ''
  for (const c of data.title) {
    const test = line + c
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, 90, y)
      y += 78
      line = c
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, 90, y)

  // 日期 / 天数
  ctx.font = '34px sans-serif'
  ctx.fillStyle = data.accent
  ctx.fillText(data.departedText, 90, textTop + titleLines * 78 + 30)
  ctx.fillText(data.daysText, 90, textTop + titleLines * 78 + 84)

  // 细边框
  ctx.strokeStyle = data.border
  ctx.lineWidth = 6
  ctx.strokeRect(30, 30, W - 60, H - 60)

  // 底部角标
  ctx.textAlign = 'center'
  ctx.fillStyle = data.border
  ctx.font = '26px sans-serif'
  ctx.fillText('归野 · 出去走走 · 分享我的旅程', W / 2, H - 70)

  return canvas
}

/** 触发下载 PNG（文件名默认"归野分享图.png"） */
export function downloadShareCard(canvas: HTMLCanvasElement, filename = '归野分享图.png'): void {
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}
