import { loadArray, save } from '../storage/store'
import { K } from '../storage/keys'
import type { Trip, UpcomingEntry } from '../types'
import { createUpcomingEntry } from '../types'

function isUpcomingEntry(x: unknown): x is UpcomingEntry {
  if (!x || typeof x !== 'object') return false
  const e = x as UpcomingEntry
  return (
    typeof e.id === 'string' &&
    typeof e.addedAt === 'number' &&
    typeof e.prepKey === 'string' &&
    typeof e.prepDone === 'boolean' &&
    !!e.trip &&
    typeof e.trip === 'object' &&
    typeof (e.trip as Trip).departDate === 'string' &&
    typeof (e.trip as Trip).totalDays === 'number' &&
    typeof (e.trip as Trip).startPoint === 'string' &&
    Array.isArray((e.trip as Trip).waypoints)
  )
}

/** 深拷贝行程，隔离快照与后续编辑 */
function cloneTrip(trip: Trip): Trip {
  return JSON.parse(JSON.stringify(trip)) as Trip
}

export function listUpcoming(): UpcomingEntry[] {
  return loadArray(K.upcoming, isUpcomingEntry, [])
}

export function getUpcoming(id: string): UpcomingEntry | null {
  return listUpcoming().find((e) => e.id === id) ?? null
}

/** 加入待出行：存行程快照，返回条目 id */
export function addUpcoming(trip: Trip): string {
  const entry = createUpcomingEntry(cloneTrip(trip))
  save(K.upcoming, [...listUpcoming(), entry])
  return entry.id
}

export function removeUpcoming(id: string): void {
  save(
    K.upcoming,
    listUpcoming().filter((e) => e.id !== id),
  )
}

export function markPrepDone(id: string, done: boolean): void {
  save(
    K.upcoming,
    listUpcoming().map((e) => (e.id === id ? { ...e, prepDone: done } : e)),
  )
}
