import { useEffect, useRef, useState, type JSX } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTrip } from '../../../lib/trip'
import { getReviewData } from '../../../lib/review/seedStore'
import {
  buildDraft,
  savePublishedPost,
  COVER_OPTIONS,
  type PublishDraft,
  type PostVisibility,
} from '../../../lib/community/userPosts'
import type { DiaryEntry } from '../../../types'
import PublishHeader from './components/PublishHeader'
import CoverPicker from './components/CoverPicker'
import TitleField from './components/TitleField'
import RouteMini from './components/RouteMini'
import DiaryPicker from './components/DiaryPicker'
import VisibilitySegment from './components/VisibilitySegment'
import FinalizeCard from './components/FinalizeCard'

/** 区块 label 口径：11.5px #8a9689，与 TitleField 保持一致 */
const sectionLabelStyle: JSX.IntrinsicElements['label']['style'] = {
  fontSize: 11.5,
  color: '#8a9689',
  margin: '12px 0 7px',
  letterSpacing: '.5px',
  display: 'block',
}

/**
 * 发布编辑页（Plan 7 · Task 4，路由 /publish，无 props）：
 * - 挂载后 getReviewData(getTrip()) 取 entries，buildDraft 初始化 draft；
 *   未就绪渲染「正在准备发布…」，不白屏；
 * - 标题 / 封面 / 选中日记集合 / 可见范围均受控于 draft；
 * - 顶部「发布」与底部「整理并发布」都调 savePublishedPost(getTrip(), entries, draft)，
 *   成功后 navigate('/community')；「先不发」与返回均 navigate(-1)。
 */
export default function PublishPage(): JSX.Element {
  const navigate = useNavigate()
  const [entries, setEntries] = useState<DiaryEntry[] | null>(null)
  const [draft, setDraft] = useState<PublishDraft | null>(null)
  /** 存储写失败 / 空选时置 true，渲染错误提示且不导航；改动草稿后自动清除 */
  const [submitError, setSubmitError] = useState(false)
  const aliveRef = useRef(true)

  useEffect(() => {
    aliveRef.current = true
    const trip = getTrip()
    getReviewData(trip)
      .then(({ entries: list }) => {
        if (!aliveRef.current) return
        setEntries(list)
        setDraft(buildDraft(trip, list))
      })
      .catch(() => {
        // 播种 / 读库失败不白屏：空日记进入就绪态，草稿由 buildDraft 兜底
        if (!aliveRef.current) return
        setEntries([])
        setDraft(buildDraft(trip, []))
      })
    return () => {
      aliveRef.current = false
    }
  }, [])

  /** 标题受控更新 */
  const updateTitle = (title: string): void => {
    setDraft((prev) => (prev ? { ...prev, title } : prev))
  }

  /** 封面循环切换：当前下标 +1，越过末尾回到 0 */
  const changeCover = (): void => {
    setDraft((prev) => {
      if (!prev) return prev
      const index = COVER_OPTIONS.indexOf(prev.cover)
      const next = COVER_OPTIONS[(index + 1) % COVER_OPTIONS.length]
      return { ...prev, cover: next }
    })
  }

  /** 勾选集合切换：选中移除、未选中追加（保持追加顺序） */
  const toggleEntry = (entryId: string): void => {
    setDraft((prev) => {
      if (!prev) return prev
      const selected = prev.selectedEntryIds.includes(entryId)
        ? prev.selectedEntryIds.filter((id) => id !== entryId)
        : [...prev.selectedEntryIds, entryId]
      return { ...prev, selectedEntryIds: selected }
    })
  }

  const setVisibility = (visibility: PostVisibility): void => {
    setDraft((prev) => (prev ? { ...prev, visibility } : prev))
  }

  /**
   * 固化发布：空选 / 存储写失败（savePublishedPost 返回 null）时停留本页并提示，
   * 不按成功导航；成功落库后回社区列表。
   */
  const handleSubmit = (): void => {
    if (!entries || !draft) return
    const saved = savePublishedPost(getTrip(), entries, draft)
    if (!saved) {
      setSubmitError(true)
      return
    }
    navigate('/community')
  }

  const handleBack = (): void => {
    navigate(-1)
  }
  const handleSkip = (): void => {
    navigate(-1)
  }

  if (!draft || !entries) {
    return (
      <div
        data-testid="publish-page"
        style={{ background: '#1c2621', maxWidth: 480, margin: '0 auto', minHeight: '100svh' }}
      >
        <div
          style={{
            minHeight: '100svh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#8a9689',
            fontSize: 13,
          }}
        >
          正在准备发布…
        </div>
      </div>
    )
  }

  const hasSelection = draft.selectedEntryIds.length > 0

  return (
    <div
      data-testid="publish-page"
      style={{ background: '#1c2621', maxWidth: 480, margin: '0 auto', minHeight: '100svh' }}
    >
      <PublishHeader title="发布游记" onBack={handleBack} onSubmit={handleSubmit} disabled={!hasSelection} />

      <div style={{ padding: '15px 16px 128px' }}>
        {submitError && (
          <div
            role="alert"
            data-testid="publish-error"
            style={{
              fontSize: 12,
              color: '#f3b6ae',
              background: 'rgba(220,120,110,.16)',
              border: '1px solid rgba(220,120,110,.4)',
              borderRadius: 10,
              padding: '8px 11px',
              marginBottom: 11,
            }}
          >
            {hasSelection ? '保存失败，请检查浏览器存储后重试' : '至少选择一篇日记'}
          </div>
        )}

        <CoverPicker cover={draft.cover} onChangeCover={changeCover} />

        <TitleField value={draft.title} onChange={updateTitle} />

        <label style={sectionLabelStyle}>路线</label>
        <RouteMini nodes={draft.nodes} />

        <label style={sectionLabelStyle}>
          包含日记（{entries.length} 篇，可取消不想公开的）
        </label>
        <DiaryPicker entries={entries} selectedIds={draft.selectedEntryIds} onToggle={toggleEntry} />

        <label style={sectionLabelStyle}>谁可以看</label>
        <VisibilitySegment value={draft.visibility} onChange={setVisibility} />

        <FinalizeCard onSkip={handleSkip} onSubmit={handleSubmit} disabled={!hasSelection} />
      </div>
    </div>
  )
}
