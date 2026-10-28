import { ArrowRight, Check, ChevronDown, Compass, PenLine, Plus, Route, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Destinations } from '../data/destinations'
import { DEFAULT_START, SIMULATED_STARTS } from '../data/starts'
import { K } from '../storage/keys'
import { RouteMap } from '../components/RouteMap'
import BottomSheet from '../components/BottomSheet'
import ConfirmDialog from '../components/ConfirmDialog'
import DestinationPickerSheet from '../components/DestinationPickerSheet'
import DiaryPanel from '../components/DiaryPanel'
import { finalizeOngoing, getOngoingByTrip, publishDiaryEntry } from '../lib/community'
import { generatePrep } from '../lib/prep'
import {
  addTripDiary,
  addWaypoint,
  canDepart,
  clearActive,
  getTrip,
  removeTripDiary,
  removeWaypoint,
  replaceActive,
  routeNodes,
  setDepartDate,
  setDestination,
  setDeparted,
  setIntent,
  setStartPoint,
  setTotalDays,
  updateTripDiary,
} from '../lib/trip'
import { addUpcoming, listUpcoming, markPrepDone, removeUpcoming } from '../lib/upcoming'
import { addArchivedTrip } from '../lib/footprint'
import { addManual, getPrepList, initAuto, removeItem, toggleItem } from '../lib/prepStore'
import { cn } from '../lib/cn'

const INTENT_TYPES = ['综合', '登山徒步', '人文风景', '美食', '探险', '自然', '城市休闲']

/** 切到推荐页（全局事件，AppShell 监听后真正切换页面） */
function gotoRecommend() {
  window.dispatchEvent(new CustomEvent('gv:goto', { detail: { section: 'recommend' } }))
}

/** 由目的地名称反查库内 destinationId（社区帖 nodes 为 label，需映射回 id） */
function destIdByLabel(label: string): string | null {
  return Destinations.find((d) => d.name === label)?.id ?? null
}

/**
 * 首页：品牌页 → 规划页（字段 + 出发前准备在此完成）→ 出发 → 路线页（手账示意图 + 节点详情）。
 * view: 'brand' | 'plan' | 'route'。
 * 所有临时内容（待出行、选点、节点详情、更改路线）走 BottomSheet 覆盖层，主页框架固定不重排。
 */
export default function Home() {
  const [, setV] = useState(0)
  const refresh = () => setV((x) => x + 1)
  const trip = getTrip()
  const canGo = canDepart(trip)
  const hasDraft = canGo || trip.waypoints.length > 0 || trip.destinationId != null
  // view 持久化：切到其他主页再切回时，停在离开时的二级视图（规划中回规划、已出发回路线），不丢正在编辑的内容。
  const readView = (): 'brand' | 'plan' | 'route' => {
    try {
      const saved = localStorage.getItem(K.homeView)
      if (saved === 'route' && trip.departed) return 'route'
      // 只要点过"开始规划行程"（view 已记为 plan），切回就停在规划页，无需已填草稿
      if (saved === 'plan') return 'plan'
      if (saved === 'brand') return 'brand'
    } catch {
      /* 存储不可用时回退默认 */
    }
    return canGo ? 'plan' : 'brand'
  }
  const [view, setView] = useState<'brand' | 'plan' | 'route'>(readView)
  // 每次 view 变更写回 localStorage，切页重挂载后能恢复
  useEffect(() => {
    try {
      localStorage.setItem(K.homeView, view)
    } catch {
      /* 忽略存储写入失败 */
    }
  }, [view])
  const [picking, setPicking] = useState<'waypoint' | 'destination' | null>(null)
  const [intent, setIntentLocal] = useState<string>(trip.intentTags[0] ?? '综合')
  const [selNode, setSelNode] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)
  const [confirmDone, setConfirmDone] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [editRoute, setEditRoute] = useState(false)
  const [departHint, setDepartHint] = useState<string | null>(null)
  const [delUpcoming, setDelUpcoming] = useState<string | null>(null)
  const [showUpcoming, setShowUpcoming] = useState(false)
  const [showDiary, setShowDiary] = useState(false)

  const brandCollapsed = view !== 'brand'
  // 出发缺项（出发按钮常驻，点击时提示还差什么）
  const missing: string[] = []
  if (!trip.departDate) missing.push('出发日期')
  if (!(trip.totalDays > 0)) missing.push('总天数')
  if (!trip.startPoint) missing.push('出发点')
  if (!trip.destinationId) missing.push('最终目的地')

  // 模拟定位：出发点为空时自动填入默认城市（v2 接真实定位）。依赖 startPoint：清空/新规划后出发点为空也自动补填
  useEffect(() => {
    if (!trip.startPoint) {
      setStartPoint(DEFAULT_START)
      refresh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.startPoint])

  // 向 AppShell 广播当前是否在二级（规划/路线），驱动返回按钮可用态
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('gv:level', { detail: { inLevel: view !== 'brand' } }))
  }, [view])
  // 监听"返回"事件：路线页/规划页都直接回品牌页
  useEffect(() => {
    const onBack = () => {
      setView('brand')
      setPicking(null)
      setEditRoute(false)
    }
    window.addEventListener('gv:back-level', onBack)
    return () => window.removeEventListener('gv:back-level', onBack)
  }, [])

  // 复用他人路线：接收社区广播的草稿（结构化 nodes + 天数），预填规划页并切到规划视图
  useEffect(() => {
    const onDraft = (e: Event) => {
      const d = (e as CustomEvent<{ nodes?: { type: string; label: string }[]; days?: number }>).detail
      if (!d?.nodes?.length) return
      const t = getTrip()
      for (const wp of [...(t.waypoints ?? [])]) removeWaypoint(wp)
      for (const n of d.nodes) if (n.type === 'start' && n.label) setStartPoint(n.label)
      for (const n of d.nodes) {
        if (n.type === 'waypoint') {
          const id = destIdByLabel(n.label)
          if (id) addWaypoint(id)
        }
      }
      for (const n of d.nodes) {
        if (n.type === 'destination') {
          const id = destIdByLabel(n.label)
          if (id) setDestination(id)
        }
      }
      if (typeof d.days === 'number' && d.days > 0) setTotalDays(d.days)
      refresh()
      setView('plan')
    }
    window.addEventListener('gv:plan-draft', onDraft)
    return () => window.removeEventListener('gv:plan-draft', onDraft)
  }, [])

  // —— 出发前准备（在规划页完成）：季节按出发日期月份，路线所有点气候汇总 ——
  const prepKey = trip.id
  const month = trip.departDate ? Number(trip.departDate.slice(5, 7)) : new Date().getMonth() + 1
  const routeDestIds = [...new Set([...(trip.waypoints ?? []), ...(trip.destinationId ? [trip.destinationId] : [])])]
  const base = routeDestIds.flatMap((id) => {
    const d = Destinations.find((x) => x.id === id)
    return d ? generatePrep(d, month, trip.intentTags[0]) : []
  })
  const prepList = getPrepList(prepKey)
  useEffect(() => {
    if (prepList.length === 0 && base.length > 0) {
      initAuto(prepKey, base)
      refresh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prepKey, base.length])
  const prepDone = prepList.length > 0 && prepList.every((i) => i.checked)

  const upcoming = listUpcoming()
  const destById = (id: string) => Destinations.find((d) => d.id === id)

  function pick(intentTag: string) {
    setIntent(intentTag === '综合' ? '' : intentTag)
    setIntentLocal(intentTag)
    refresh()
  }

  function joinUpcoming() {
    const id = addUpcoming(trip)
    if (prepDone) markPrepDone(id, true)
    clearActive()
    setShowUpcoming(true)
    setView('brand')
    setPicking(null)
    setIntentLocal('综合')
    refresh()
  }

  function continueTrip(snapshotTrip: ReturnType<typeof getTrip>) {
    replaceActive(JSON.parse(JSON.stringify(snapshotTrip)))
    setShowUpcoming(false)
    setView('plan')
    setPicking(null)
    setEditRoute(false)
    setIntentLocal(snapshotTrip.intentTags[0] ?? '综合')
    refresh()
  }

  /** 点待出行的"出发"：用这条行程进入路线页，并从待出行移除 */
  function departTrip(id: string, snapshotTrip: ReturnType<typeof getTrip>) {
    removeUpcoming(id)
    replaceActive(JSON.parse(JSON.stringify(snapshotTrip)))
    setDeparted(true)
    setShowUpcoming(false)
    setView('route')
    setSelNode(null)
    setPicking(null)
    setEditRoute(false)
    setIntentLocal(snapshotTrip.intentTags[0] ?? '综合')
    refresh()
  }

  /** 规划页点"出发"：进入路线页并标记已出发 */
  function departActive() {
    setDeparted(true)
    setView('route')
    setSelNode(null)
    setPicking(null)
    setEditRoute(false)
    refresh()
  }

  /** 出发按钮常驻：条件不齐时提示还差什么，不跳页 */
  function handleDepart() {
    if (!canGo) {
      setDepartHint(`还差：${missing.join('、')}，填好后即可出发`)
      return
    }
    setDepartHint(null)
    departActive()
  }

  /** 删除当前行程（清空为空白行程），二次确认后调用 */
  function deleteCurrentTrip() {
    clearActive()
    setConfirmDel(false)
    setView('brand')
    setSelNode(null)
    setPicking(null)
    setEditRoute(false)
    setIntentLocal('综合')
    refresh()
  }

  /** 路线页"已完成出行"：当前行程（含日记）存入足迹档案，清空当前行程回品牌页 */
  function finishTrip() {
    // 边走边发收尾：有 ongoing 帖则自动固化成 completed 静态帖（已发布内容冻结，不再依赖 live trip）
    if (getOngoingByTrip(trip.id)) {
      finalizeOngoing(trip.id, trip)
    }
    const archived = { ...trip, departedAt: Date.now(), departed: true }
    addArchivedTrip(archived)
    clearActive()
    setConfirmDone(false)
    setView('brand')
    setSelNode(null)
    setPicking(null)
    setEditRoute(false)
    setIntentLocal('综合')
    refresh()
  }

  /** 品牌页"新的规划"：清空当前行程，进入空白规划页（下一次规划） */
  function newPlan() {
    clearActive()
    setConfirmDel(false)
    setView('plan')
    setSelNode(null)
    setPicking(null)
    setIntentLocal('综合')
    refresh()
  }

  /** 规划页"清空"：重置当前规划表单为空白（留在规划页），二次确认后调用 */
  function clearPlan() {
    clearActive()
    setConfirmClear(false)
    setPicking(null)
    setIntentLocal('综合')
    setSelNode(null)
    refresh()
  }

  /** 删除待出行条目；删空则关闭面板 */
  function confirmDeleteUpcoming() {
    if (!delUpcoming) return
    removeUpcoming(delUpcoming)
    setDelUpcoming(null)
    if (listUpcoming().length === 0) setShowUpcoming(false)
    refresh()
  }

  // 选点面板
  const pickDestinations =
    picking === 'destination'
      ? Destinations
      : Destinations.filter((d) => !trip.waypoints.includes(d.id) && d.id !== trip.destinationId)

  // 路线节点详情（点节点）
  const selDetail = (() => {
    if (!selNode) return null
    if (selNode === 'start') return { kind: 'start' as const, label: trip.startPoint }
    const destId = selNode.replace(/^(wp|dest)_/, '')
    const d = destById(destId)
    if (!d) return null
    return { kind: 'dest' as const, d, waypoint: selNode.startsWith('wp_') }
  })()

  return (
    <div className="h-full">
      {/* —— 品牌区（brand）：固定满屏，不随任何弹层变化 —— */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-300',
          brandCollapsed ? 'max-h-0 opacity-0' : 'h-full opacity-100',
        )}
      >
        <div className="flex h-full flex-col items-center justify-center text-center">
          <h1 className="font-display text-5xl tracking-wide text-primary">归野</h1>
          <p className="mt-2 text-lg text-muted-foreground">出去走走</p>
          <p className="mt-6 max-w-[17rem] text-sm text-muted-foreground">
            挑个想去的地方，排成一条路线，把出发前的准备也备齐。
          </p>
          {hasDraft ? (
            <div className="mt-8 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditRoute(false)
                  setView(trip.departed ? 'route' : 'plan')
                }}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-primary-foreground shadow-sm transition-transform active:scale-[0.98]"
              >
                <Route size={18} />
                继续行程
              </button>
              <button
                type="button"
                onClick={newPlan}
                className="inline-flex items-center gap-2 rounded-full border border-leaf px-5 py-2.5 text-sm text-primary transition-transform active:scale-[0.98]"
              >
                <Plus size={16} /> 新的规划
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setView('plan')}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-primary-foreground shadow-sm transition-transform active:scale-[0.98]"
            >
              <Route size={18} />
              开始规划行程
            </button>
          )}
          <button
            type="button"
            onClick={gotoRecommend}
            className="mt-5 inline-flex items-center gap-1 text-sm text-primary"
          >
            还没想好去哪儿？去推荐看看吧 <ArrowRight size={14} />
          </button>
          {hasDraft && (
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.focus()
                setConfirmDel(true)
              }}
              className="mt-8 inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-destructive"
            >
              <Trash2 size={13} /> 删除当前行程
            </button>
          )}
        </div>
      </div>

      {/* —— 规划页（plan）—— */}
      <div className={cn('transition-all duration-300', view === 'plan' ? 'opacity-100' : 'max-h-0 overflow-hidden opacity-0')}>
        <div className="flex items-baseline justify-between pt-1">
          <h1 className="font-display text-2xl tracking-wide text-primary">归野</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">规划这趟出发</span>
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-destructive"
            >
              清空
            </button>
          </div>
        </div>

        {/* 字段表单 */}
        <section className="mt-4 space-y-4 rounded-lg border border-border bg-card p-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">出发日期</span>
              <input
                type="date"
                value={trip.departDate ?? ''}
                onChange={(e) => {
                  setDepartDate(e.target.value || null)
                  refresh()
                }}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-leaf"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">总天数</span>
              <input
                type="number"
                min={1}
                value={trip.totalDays}
                onChange={(e) => {
                  setTotalDays(Number(e.target.value) || 1)
                  refresh()
                }}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-leaf"
              />
            </label>
          </div>

          <StartPointField value={trip.startPoint} onChange={(v) => { setStartPoint(v); refresh() }} listId="start-cities" />

          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">最终目的地</span>
            <button
              type="button"
              onClick={() => setPicking('destination')}
              className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left text-sm"
            >
              <Plus size={15} className="text-leaf" />
              <span className={trip.destinationId ? 'text-foreground' : 'text-muted-foreground'}>
                {trip.destinationId ? destById(trip.destinationId)?.name : '选一个最终目的地'}
              </span>
            </button>
          </label>

          {/* 途经点 */}
          <div>
            <span className="mb-1 block text-xs text-muted-foreground">途经点（可加多个）</span>
            {trip.waypoints.length > 0 && (
              <ul className="mb-2 space-y-1">
                {trip.waypoints.map((id) => {
                  const d = destById(id)
                  return (
                    <li key={id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                      <span className="flex-1 text-sm">{d?.name ?? id}</span>
                      <span className="text-xs text-muted-foreground">{d?.location}</span>
                      <button
                        type="button"
                        aria-label={`移除途经点${d?.name ?? id}`}
                        onClick={() => {
                          removeWaypoint(id)
                          refresh()
                        }}
                        className="p-0.5 text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            <button
              type="button"
              onClick={() => setPicking('waypoint')}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-leaf px-3 py-2 text-sm text-primary"
            >
              <Plus size={15} /> 加一个途经点
            </button>
          </div>

          {/* 意图 */}
          <div>
            <span className="mb-1 block text-xs text-muted-foreground">这次为什么出发？</span>
            <div className="flex flex-wrap gap-2">
              {INTENT_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => pick(t)}
                  className={
                    intent === t
                      ? 'rounded-full bg-primary px-3 py-1.5 text-sm text-primary-foreground'
                      : 'rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground'
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* 动作：出发（常驻，点击校验）/ 加入待出行 */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleDepart}
                className="rounded-full bg-primary px-4 py-3 text-primary-foreground"
              >
                出发，看路线
              </button>
              <button
                type="button"
                onClick={joinUpcoming}
                className="rounded-full border border-border bg-card px-4 py-3 text-foreground"
              >
                加入待出行
              </button>
            </div>
            {!canGo && (
              <p className="text-center text-xs text-destructive">{departHint ?? `还差：${missing.join('、')}，填好即可出发`}</p>
            )}
          </div>
        </section>

        {/* 出发前准备（规划页完成，不带进路线页） */}
        <section className="mt-4 space-y-3 rounded-lg border border-border bg-card p-4">
          <h3 className="flex items-center gap-1.5 font-display text-lg">
            <Check size={18} className="text-leaf" /> 出发前准备
            {prepDone && <span className="ml-auto rounded-full bg-leaf px-2 py-0.5 text-[11px] text-white">万事俱备</span>}
          </h3>
          {prepDone ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-leaf text-white">
                <Check size={20} />
              </span>
              <h4 className="font-display text-xl">万事俱备，现在就出发</h4>
              <p className="text-sm text-muted-foreground">出发前准备已全部勾选完成。</p>
            </div>
          ) : prepList.length === 0 ? (
            <p className="text-sm text-muted-foreground">还没有要带的清单，先填好目的地和途经点。</p>
          ) : (
            <>
              <ul className="rounded-lg border border-border">
                {prepList.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0">
                    <button
                      type="button"
                      aria-label="勾选完成"
                      onClick={() => {
                        toggleItem(prepKey, item.id)
                        refresh()
                      }}
                      className={
                        item.checked
                          ? 'flex h-5 w-5 items-center justify-center rounded-full bg-leaf text-white'
                          : 'flex h-5 w-5 items-center justify-center rounded-full border-2 border-border'
                      }
                    >
                      {item.checked && '✓'}
                    </button>
                    <span className={item.checked ? 'flex-1 text-muted-foreground line-through' : 'flex-1'}>{item.text}</span>
                    <button
                      type="button"
                      aria-label="删除"
                      onClick={() => {
                        removeItem(prepKey, item.id)
                        refresh()
                      }}
                      className="p-1 text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const v = new FormData(e.currentTarget).get('item')
                  if (typeof v === 'string' && v.trim()) {
                    addManual(prepKey, v.trim())
                    refresh()
                  }
                }}
                className="mt-2 flex gap-2"
              >
                <input
                  name="item"
                  placeholder="自己再加一件要带的…"
                  className="flex-1 rounded-full border border-border bg-card px-3 py-2 text-sm outline-none focus:border-leaf"
                />
                <button type="submit" className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">
                  添加
                </button>
              </form>
            </>
          )}
        </section>
      </div>

      {/* —— 路线页（route）—— */}
      <div className={cn('transition-opacity duration-300', view === 'route' ? 'opacity-100' : 'max-h-0 overflow-hidden opacity-0')}>
        <div className="flex items-baseline justify-between pt-1">
          <h1 className="font-display text-2xl tracking-wide text-primary">你的路线</h1>
          <span className="text-sm text-muted-foreground">
            {trip.departDate ? `${trip.departDate.slice(5, 7)}月${trip.departDate.slice(8, 10)}日出发` : ''} · {trip.totalDays} 天
          </span>
        </div>

        <section className="mt-4 rounded-lg border border-border bg-card p-4">
          <RouteMap nodes={routeNodes(trip)} selectedKey={selNode} onSelect={setSelNode} />
          <p className="mt-2 text-center text-xs text-muted-foreground">点每个节点，查看这个点的天气与值得玩的景点</p>

          {/* 路线日记：边走边记（插照片进相册库），完成出行后跟随行程存足迹 */}
          <button
            type="button"
            onClick={() => setShowDiary(true)}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full border border-border bg-card px-4 py-2.5 text-sm text-foreground"
          >
            <PenLine size={15} className="text-leaf" /> 路线日记
            {trip.diary?.length ? <span className="text-xs text-muted-foreground">（{trip.diary.length}）</span> : null}
          </button>

          {/* 已完成出行：存档进足迹（回顾） */}
          <button
            type="button"
            onClick={() => setConfirmDone(true)}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
          >
            <Check size={15} /> 已完成出行
          </button>

          {/* 更改 / 退出 */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setEditRoute(true)}
              className="rounded-full border border-border bg-card px-4 py-2.5 text-sm text-foreground"
            >
              更改路线
            </button>
            <button
              type="button"
              onClick={() => {
                setEditRoute(false)
                setSelNode(null)
                setView('brand')
              }}
              className="rounded-full border border-border bg-card px-4 py-2.5 text-sm text-foreground"
            >
              退出
            </button>
          </div>
          <button
            type="button"
            onClick={() => setConfirmDel(true)}
            className="mt-3 flex w-full items-center justify-center gap-1 rounded-full border border-destructive/40 bg-card py-2.5 text-sm text-destructive"
          >
            <Trash2 size={14} /> 删除当前路线
          </button>
        </section>
      </div>

      {/* —— 待出行：品牌页底部悬浮入口（不占文档流）—— */}
      {view === 'brand' && upcoming.length > 0 && (
        <button
          type="button"
          onClick={() => setShowUpcoming(true)}
          className="fixed inset-x-0 bottom-6 z-30 mx-auto flex w-fit items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 font-display text-sm text-foreground shadow-lg"
        >
          <Compass size={16} className="text-sun" />
          <span>你有 {upcoming.length} 条待出行规划</span>
          <ChevronDown size={16} />
        </button>
      )}

      {/* —— 待出行清单：半屏上拉面板 —— */}
      <BottomSheet open={showUpcoming} onClose={() => setShowUpcoming(false)} title={`待出行 · ${upcoming.length} 条`}>
        {upcoming.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">暂无待出行规划。</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <div className="flex-1">
                  <p className="font-display">{e.trip.intentTags[0] ?? '待出发'}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.trip.departDate ? `${e.trip.departDate.slice(5, 7)}月${e.trip.departDate.slice(8, 10)}日` : ''}
                    {e.trip.totalDays} 天 · {e.trip.waypoints.length + (e.trip.destinationId ? 1 : 0)} 个目的地
                    {e.prepDone ? ' · 万事俱备' : ' · 待准备'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => continueTrip(e.trip)}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground"
                >
                  继续规划
                </button>
                <button
                  type="button"
                  aria-label="出发"
                  onClick={() => departTrip(e.id, e.trip)}
                  className="rounded-full bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                >
                  出发
                </button>
                <button
                  type="button"
                  aria-label={`删除待出行${e.trip.intentTags[0] ?? '规划'}`}
                  onClick={() => setDelUpcoming(e.id)}
                  className="p-1.5 text-muted-foreground hover:text-red-500"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </BottomSheet>

      {/* —— 选点（目的地/途经点）：半屏上拉面板，规划页与更改路线共用 —— */}
      <DestinationPickerSheet
        open={picking !== null}
        onClose={() => setPicking(null)}
        title={picking === 'destination' ? '选一个最终目的地' : '加一个途经点'}
        destinations={pickDestinations}
        zIndex={editRoute ? 60 : 50}
        closeOnPick={picking === 'destination'}
        onPick={(id) => {
          if (picking === 'destination') setDestination(id)
          else addWaypoint(id)
          refresh()
        }}
      />

      {/* —— 路线节点详情：半屏上拉面板 —— */}
      <BottomSheet
        open={!!selNode && view === 'route'}
        onClose={() => setSelNode(null)}
        title={selDetail?.kind === 'start' ? `${trip.startPoint} · 出发点` : selDetail?.d.name ?? ''}
      >
        {selDetail?.kind === 'start' ? (
          <div>
            <p className="text-sm text-muted-foreground">从这里出发。真实定位与出发地天气 v2 接入。</p>
          </div>
        ) : selDetail ? (
          <div>
            {selDetail.waypoint && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-primary">途经点</span>
            )}
            <p className="mt-1 text-xs text-muted-foreground">{selDetail.d.location}</p>
            <p className="mt-2 text-sm text-muted-foreground">{selDetail.d.intro}</p>
            {selDetail.d.climate?.perMonth?.[month] && (
              <div className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                {month} 月 {selDetail.d.climate.perMonth[month].high}° / 低
                {selDetail.d.climate.perMonth[month].low}°，
                {selDetail.d.climate.perMonth[month].rain === '多雨'
                  ? '降水偏多'
                  : selDetail.d.climate.perMonth[month].rain === '干'
                    ? '较干燥'
                    : '雨量适中'}
                <br />
                <span className="text-xs text-muted-foreground">{selDetail.d.climate.perMonth[month].clothing}</span>
              </div>
            )}
            {selDetail.d.attractions.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground">值得玩的景点</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {selDetail.d.attractions.map((a) => (
                    <span key={a} className="rounded-full bg-leaf/15 px-2 py-0.5 text-xs text-primary">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </BottomSheet>

      {/* —— 更改路线：加高上拉面板（表单内滚动，完成收起）—— */}
      <BottomSheet
        open={editRoute}
        onClose={() => setEditRoute(false)}
        title="更改路线"
        height="tall"
        footer={
          <button
            type="button"
            onClick={() => setEditRoute(false)}
            className="w-full rounded-full bg-primary px-4 py-3 text-primary-foreground"
          >
            完成
          </button>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">出发日期</span>
              <input
                type="date"
                value={trip.departDate ?? ''}
                onChange={(e) => {
                  setDepartDate(e.target.value || null)
                  refresh()
                }}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-leaf"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">总天数</span>
              <input
                type="number"
                min={1}
                value={trip.totalDays}
                onChange={(e) => {
                  setTotalDays(Number(e.target.value) || 1)
                  refresh()
                }}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-leaf"
              />
            </label>
          </div>

          <StartPointField value={trip.startPoint} onChange={(v) => { setStartPoint(v); refresh() }} listId="edit-start-cities" />

          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">最终目的地</span>
            <button
              type="button"
              onClick={() => setPicking('destination')}
              className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left text-sm"
            >
              <Plus size={15} className="text-leaf" />
              <span className={trip.destinationId ? 'text-foreground' : 'text-muted-foreground'}>
                {trip.destinationId ? destById(trip.destinationId)?.name : '选一个最终目的地'}
              </span>
            </button>
          </label>

          <div>
            <span className="mb-1 block text-xs text-muted-foreground">途经点（可加多个）</span>
            {trip.waypoints.length > 0 && (
              <ul className="mb-2 space-y-1">
                {trip.waypoints.map((id) => {
                  const d = destById(id)
                  return (
                    <li key={id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                      <span className="flex-1 text-sm">{d?.name ?? id}</span>
                      <button
                        type="button"
                        aria-label={`移除途经点${d?.name ?? id}`}
                        onClick={() => {
                          removeWaypoint(id)
                          refresh()
                        }}
                        className="p-0.5 text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            <button
              type="button"
              onClick={() => setPicking('waypoint')}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-leaf px-3 py-2 text-sm text-primary"
            >
              <Plus size={15} /> 加一个途经点
            </button>
          </div>
          <p className="text-xs text-muted-foreground">改动即时生效，完成后回到路线示意图。</p>
        </div>
      </BottomSheet>

      {/* —— 二次确认 —— */}
      <ConfirmDialog
        open={confirmClear}
        title="确定清空当前规划？"
        description="已填的内容会清除，可开始一份新的规划。"
        confirmText="确认清空"
        onConfirm={clearPlan}
        onCancel={() => setConfirmClear(false)}
      />
      <ConfirmDialog
        open={confirmDel}
        title="确定删除当前行程？"
        description="删除后无法恢复，已规划的路线和准备清单都会清空。"
        confirmText="确认删除"
        onConfirm={deleteCurrentTrip}
        onCancel={() => setConfirmDel(false)}
      />
      <ConfirmDialog
        open={confirmDone}
        title="已完成出行？"
        description="这条行程会存入足迹（只读回顾），当前路线将清空回到首页。"
        confirmText="完成并存入足迹"
        danger={false}
        onConfirm={finishTrip}
        onCancel={() => setConfirmDone(false)}
      />
      {/* 路线日记：边走边记，完成出行后跟随行程存足迹（存进行中的 active trip） */}
      <DiaryPanel
        open={showDiary}
        onClose={() => setShowDiary(false)}
        trip={trip}
        entries={trip.diary ?? []}
        onChanged={refresh}
        onAdd={addTripDiary}
        onUpdate={updateTripDiary}
        onRemove={removeTripDiary}
        onPublish={(entryId) => { publishDiaryEntry(trip.id, entryId, trip); refresh() }}
        publishedEntryIds={getOngoingByTrip(trip.id)?.publishedEntryIds ?? []}
      />
      <ConfirmDialog
        open={!!delUpcoming}
        title="确定删除这条待出行规划？"
        description="删除后无法恢复。"
        confirmText="确认删除"
        onConfirm={confirmDeleteUpcoming}
        onCancel={() => setDelUpcoming(null)}
      />
    </div>
  )
}

/** 出发点字段（模拟定位自动填，可手动改；规划页与更改路线共用） */
function StartPointField({ value, onChange, listId }: { value: string; onChange: (v: string) => void; listId: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted-foreground">出发点</span>
      <input
        value={value}
        list={listId}
        onChange={(e) => onChange(e.target.value)}
        placeholder="从哪里出发"
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-leaf"
      />
      <datalist id={listId}>
        {SIMULATED_STARTS.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <span className="mt-1 block text-[11px] text-muted-foreground">已按当前位置自动填入（模拟定位，v2 接真实定位）</span>
    </label>
  )
}

/** 空态提示：可带一个跳转按钮（全局事件切到对应主页面）。个人空间等页面复用 */
export function EmptyHint({ text, to, label }: { text: string; to?: string; label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-card/50 px-4 py-6 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
      {to && label && (
        <button
          type="button"
          onClick={() => {
            const id = to.replace(/^\//, '')
            window.dispatchEvent(new CustomEvent('gv:goto', { detail: { section: id } }))
          }}
          className="text-sm text-primary underline underline-offset-4"
        >
          {label}
        </button>
      )}
    </div>
  )
}
