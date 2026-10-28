import { Destinations } from '../data/destinations'
import { routeNodes } from './trip'
import { loadArray, save } from '../storage/store'
import { K } from '../storage/keys'
import type { Trip } from '../types'

/**
 * 社区分享 · 不可变行程快照地基（v1.15 只做内部能力，不做分享按钮）。
 *
 * 设计动机：将来一键分享到社区时，若直接引用 live 行程/日记/照片，
 * 用户后续编辑 live 数据会悄悄污染已分享内容。因此分享以"导出时的快照"
 * 为准——快照与 live 彻底解耦，社区引用的是不可变拷贝。
 */
export interface TripSnapshotNode {
  key: string
  type: 'start' | 'waypoint' | 'destination'
  label?: string
}

export interface TripSnapshotDiary {
  text: string
  photoIds: string[]
  nodeId: string | null
  createdAt: number
}

export interface TripSnapshot {
  tripId: string
  /** 路线拼接（出发点 → 途经点 → 目的地） */
  title: string
  departedAt: number | null
  totalDays: number
  nodes: TripSnapshotNode[]
  diary: TripSnapshotDiary[]
  /** 导出时间戳（分享时间） */
  exportedAt: number
}

function destName(id: string): string {
  return Destinations.find((d) => d.id === id)?.name ?? id
}

/** 把行程导出为不可变快照（深拷贝，与 live 解耦） */
export function exportTripSnapshot(trip: Trip): TripSnapshot {
  const nodes = routeNodes(trip)
  const title = nodes.map((n) => n.label ?? destName(n.destinationId ?? '')).join(' → ') || '未命名的行程'
  return {
    tripId: trip.id,
    title,
    departedAt: trip.departedAt,
    totalDays: trip.totalDays,
    nodes: nodes.map((n) => {
      const label = n.label ?? (n.destinationId ? destName(n.destinationId) : undefined)
      return { key: n.key, type: n.type, ...(label !== undefined ? { label } : {}) }
    }),
    diary: (Array.isArray(trip.diary) ? trip.diary : []).map((e) => ({
      text: e.text,
      photoIds: [...e.photoIds],
      nodeId: e.nodeId,
      createdAt: e.createdAt,
    })),
    exportedAt: Date.now(),
  }
}

export function getSnapshots(): TripSnapshot[] {
  return loadArray(K.snapshots, (x): x is TripSnapshot => !!x && typeof (x as TripSnapshot).tripId === 'string', [])
}

export function saveSnapshot(snap: TripSnapshot): void {
  save(K.snapshots, [...getSnapshots(), snap])
}
