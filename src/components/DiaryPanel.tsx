import { useRef, useState } from 'react'
import { Camera, MapPin, Pencil, Plus, Send, Trash2, X } from 'lucide-react'
import BottomSheet from './BottomSheet'
import { addManyToAlbum } from '../lib/album'
import PhotoThumb from './PhotoThumb'
import { routeNodes, type RouteNode } from '../lib/trip'
import { Destinations } from '../data/destinations'
import type { DiaryEntry, Trip } from '../types'

function destName(id: string): string {
  return Destinations.find((d) => d.id === id)?.name ?? id
}

interface DiaryPanelProps {
  open: boolean
  onClose: () => void
  trip: Trip
  entries: DiaryEntry[]
  onChanged: () => void
  /** 持久化回调：调用方决定存进行中行程或归档行程 */
  onAdd?: (entry: DiaryEntry) => void
  onUpdate?: (entryId: string, patch: Partial<Pick<DiaryEntry, 'text' | 'photoIds' | 'nodeId'>>) => void
  onRemove?: (entryId: string) => void
  /** 路线只读（足迹回顾场景）：仍可编辑日记，但不可改路线 */
  routeReadonly?: boolean
  /** 嵌入模式：已在外部 BottomSheet 内，不再包一层面板外壳（足迹回顾复用） */
  embedded?: boolean
  /** 边走边发：提供则在每条日记显示"发布到社区"（仅进行中行程传）；已发布条目 id 集合 */
  onPublish?: (entryId: string) => void
  publishedEntryIds?: string[]
}

/**
 * 路线日记 · 时间轴面板。
 * 共享于路线页（进行中）与足迹页（归档回顾），均支持追加/编辑/删除条目与插照片。
 * 照片统一走相册库（IndexedDB），条目只存 photoId 引用；持久化由调用方注入。
 */
export default function DiaryPanel({ open, onClose, trip, entries, onChanged, onAdd, onUpdate, onRemove, routeReadonly, embedded, onPublish, publishedEntryIds }: DiaryPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null) // 追加区：待"记下"的照片
  const editFileRef = useRef<HTMLInputElement>(null) // 编辑态：追加到某条已发布条目
  const [draft, setDraft] = useState('')
  const [pendingNode, setPendingNode] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [busy, setBusy] = useState(false)
  // 已入库但尚未"记下"的照片 id（点"记下"时随文字一起写进同一条日记）
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([])

  // 当前行程可标注的节点（出发点 → 途经点 → 目的地）
  const nodes: RouteNode[] = routeNodes(trip)
  const nodeName = (n: RouteNode) => n.label ?? destName(n.destinationId ?? '')

  // 追加区：一次多选，全部进 pendingPhotos，点"记下"随文字写进同一条
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setBusy(true)
    try {
      const added = await addManyToAlbum(files, { tripId: trip.id, takenAt: Date.now() })
      setPendingPhotos((prev) => [...prev, ...added.map((p) => p.id)])
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  // 编辑态：给某条已发布条目追加照片（一次多选，即时持久化，无确认）
  async function onEditAddFile(e: React.ChangeEvent<HTMLInputElement>, entryId: string) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setBusy(true)
    try {
      const added = await addManyToAlbum(files, { tripId: trip.id, takenAt: Date.now() })
      onUpdate?.(entryId, { photoIds: [...(entries.find((x) => x.id === entryId)?.photoIds ?? []), ...added.map((p) => p.id)] })
      onChanged()
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  // 编辑态：移除某条已发布条目里的一张照片（无确认，照片在相册库可重加）
  function removeEditPhoto(entryId: string, photoId: string) {
    const cur = entries.find((x) => x.id === entryId)?.photoIds ?? []
    onUpdate?.(entryId, { photoIds: cur.filter((p) => p !== photoId) })
    onChanged()
  }

  function commitEntry() {
    const text = draft.trim()
    // 有文字或有照片才允许记下
    if (!text && pendingPhotos.length === 0) return
    const entry: DiaryEntry = {
      id: `diary_${Date.now()}`,
      text,
      photoIds: pendingPhotos,
      nodeId: pendingNode,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    onAdd?.(entry)
    setDraft('')
    setPendingNode(null)
    setPendingPhotos([])
    onChanged()
  }

  function startEdit(e: DiaryEntry) {
    setEditingId(e.id)
    setEditText(e.text)
  }
  function saveEdit(id: string) {
    onUpdate?.(id, { text: editText })
    setEditingId(null)
    onChanged()
  }
  function del(e: DiaryEntry) {
    onRemove?.(e.id)
    onChanged()
  }

  const content = (
    <>
      {/* 顶部提示 */}
      <p className="mb-3 text-xs text-muted-foreground">
        {routeReadonly ? '这一程的随行记录，还可以继续补写。' : '边走边记，插上照片，回来还能继续写。'}
      </p>

      {/* 时间轴条目 */}
      {entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">还没有记录。写下一段见闻，或先插一张照片。</p>
      ) : (
        <ol className="relative space-y-4 border-l border-border pl-4">
          {entries.map((e) => (
            <li key={e.id} className="relative">
              {/* 时间节点 */}
              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-card bg-leaf" />
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <time>{new Date(e.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
                  {e.nodeId && (
                    <span className="inline-flex items-center gap-1 text-leaf">
                      <MapPin size={12} /> {nodeName({ key: e.nodeId, type: 'waypoint', destinationId: e.nodeId })}
                    </span>
                  )}
                </div>

                {/* 照片：查看态只读；编辑态可追加/移除（无确认） */}
                {editingId === e.id ? (
                  <div className="mb-2 flex items-center gap-2 overflow-x-auto pb-1">
                    {e.photoIds.map((pid) => (
                      <div key={pid} className="relative shrink-0">
                        <PhotoThumb photoId={pid} />
                        <button
                          type="button"
                          aria-label="移除这张照片"
                          onClick={() => removeEditPhoto(e.id, pid)}
                          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      aria-label="追加照片到这条日记"
                      onClick={() => editFileRef.current?.click()}
                      disabled={busy}
                      className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground hover:bg-muted"
                    >
                      <Plus size={18} />
                    </button>
                    <input ref={editFileRef} type="file" accept="image/*" multiple className="hidden" aria-label="编辑追加照片" onChange={(ev) => onEditAddFile(ev, e.id)} />
                  </div>
                ) : e.photoIds.length > 0 ? (
                  <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
                    {e.photoIds.map((pid) => (
                      <PhotoThumb key={pid} photoId={pid} />
                    ))}
                  </div>
                ) : null}

                {/* 文字：查看 / 编辑 */}
                {editingId === e.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(ev) => setEditText(ev.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                      placeholder="写点什么…"
                    />
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setEditingId(null)} className="rounded-full border border-border px-3 py-1 text-sm text-muted-foreground">
                        取消
                      </button>
                      <button type="button" onClick={() => saveEdit(e.id)} className="rounded-full bg-primary px-3 py-1 text-sm text-primary-foreground">
                        保存
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{e.text || <span className="text-muted-foreground">（仅照片）</span>}</p>
                )}

                {/* 操作：发布 / 编辑 / 删除（非编辑态显示） */}
                {editingId !== e.id && (
                  <div className="mt-2 flex justify-end gap-1">
                    {onPublish && (
                      <button
                        type="button"
                        aria-label={publishedEntryIds?.includes(e.id) ? '已发布到社区' : '发布到社区'}
                        onClick={() => onPublish(e.id)}
                        disabled={publishedEntryIds?.includes(e.id)}
                        className={
                          'flex items-center gap-1 rounded-full p-1.5 text-xs ' +
                          (publishedEntryIds?.includes(e.id) ? 'text-leaf' : 'text-muted-foreground hover:bg-muted')
                        }
                      >
                        <Send size={13} /> {publishedEntryIds?.includes(e.id) ? '已发布' : '发布'}
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label="编辑这条日记"
                      onClick={() => startEdit(e)}
                      className="flex items-center gap-1 rounded-full p-1.5 text-xs text-muted-foreground hover:bg-muted"
                    >
                      <Pencil size={13} /> 编辑
                    </button>
                    <button
                      type="button"
                      aria-label="删除这条日记"
                      onClick={() => del(e)}
                      className="flex items-center gap-1 rounded-full p-1.5 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={13} /> 删除
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {/* 追加区（面板底部，始终可用） */}
      <div className="mt-4 space-y-2 rounded-lg border border-dashed border-border bg-card/50 p-3">
        <textarea
          value={draft}
          onChange={(ev) => setDraft(ev.target.value)}
          rows={2}
          placeholder="写下此刻的见闻…"
          className="w-full resize-none rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <div className="flex items-center gap-2">
          {/* 标注节点 */}
          <select
            value={pendingNode ?? ''}
            onChange={(ev) => setPendingNode(ev.target.value || null)}
            className="rounded-md border border-border bg-card px-2 py-1.5 text-xs text-muted-foreground outline-none focus:border-primary"
            aria-label="标注当前节点"
          >
            <option value="">当前在…（可空）</option>
            {nodes.map((n) => (
              <option key={n.key} value={n.destinationId ?? n.key}>
                {nodeName(n)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
            aria-label="插入照片"
          >
            <Camera size={15} /> {busy ? '处理中…' : '照片'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" aria-label="相册选照片" onChange={onFile} />
          <button
            type="button"
            onClick={commitEntry}
            disabled={!draft.trim() && pendingPhotos.length === 0}
            className="ml-auto rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            记下
          </button>
        </div>
        {/* 待插入照片预览（点"记下"随文字一起写进同一条日记） */}
        {pendingPhotos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pt-1">
            {pendingPhotos.map((pid) => (
              <PhotoThumb key={pid} photoId={pid} />
            ))}
          </div>
        )}
      </div>
    </>
  )

  if (embedded) return <div className="space-y-3">{content}</div>
  return (
    <BottomSheet open={open} onClose={onClose} title="路线日记" height="tall" zIndex={50}>
      {content}
    </BottomSheet>
  )
}
