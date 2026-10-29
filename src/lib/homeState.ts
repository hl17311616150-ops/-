import { getDraft } from './planningDraft'
import { loadObject } from '../storage/store'
import { K } from '../storage/keys'
import type { PlanningStep, Trip } from '../types'

export type HomeState =
  | { kind: 'fresh' }
  | { kind: 'draft'; stepLabel: string; hint: string }
  | { kind: 'generated'; title: string; tripId: string; hint: string }

const STEP_LABEL: Partial<Record<PlanningStep, string>> = {
  time: '选时间',
  route: '确认路线',
  points: '选景点',
}

export function getHomeState(): HomeState {
  const draft = getDraft()
  if (draft && draft.step !== 'result') {
    const stepLabel = STEP_LABEL[draft.step] ?? '选景点'
    return { kind: 'draft', stepLabel, hint: `上次规划到“${stepLabel}”，还差一步` }
  }

  const trip = loadObject<Trip>(K.trip, () => true)
  if (trip && trip.source === 'ai' && Array.isArray(trip.dayPlans) && trip.dayPlans.length > 0) {
    return { kind: 'generated', title: trip.title, tripId: trip.id, hint: `你有一份“${trip.title}”` }
  }

  return { kind: 'fresh' }
}
