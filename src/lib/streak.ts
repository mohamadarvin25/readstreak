import { addDays, differenceInCalendarDays, format } from 'date-fns'
import { streakFromDays, type StreakResult } from '../../supabase/functions/_shared/streak-core.ts'
import type { SessionLike } from './types'

export { FREEZE_EVERY, MAX_FREEZES } from '../../supabase/functions/_shared/streak-core.ts'
export type StreakInfo = StreakResult

/** Local calendar day key, e.g. "2026-10-13". */
export const dayKey = (d: Date | string) => format(typeof d === 'string' ? new Date(d) : d, 'yyyy-MM-dd')

/** Total seconds read per local calendar day. */
export function secondsByDay(sessions: SessionLike[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const s of sessions) {
    const k = dayKey(s.started_at)
    map.set(k, (map.get(k) ?? 0) + s.duration_seconds)
  }
  return map
}

/**
 * A day counts toward the streak when at least `minMinutes` were read that day
 * (the "2-minute rule": showing up is what matters). Rules live in streak-core.ts,
 * shared with the reminder Edge Function.
 */
export function computeStreak(sessions: SessionLike[], minMinutes = 1, today: Date = new Date()): StreakInfo {
  return streakFromDays(secondsByDay(sessions), dayKey(today), Math.max(1, minMinutes * 60))
}

/** Every local day from `from` to `to`, inclusive. */
export function eachDay(from: Date, to: Date): Date[] {
  const out: Date[] = []
  for (let d = from; differenceInCalendarDays(to, d) >= 0; d = addDays(d, 1)) out.push(d)
  return out
}
