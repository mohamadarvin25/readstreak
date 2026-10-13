import { format, startOfWeek } from 'date-fns'
import { secondsByDay } from './streak'
import { formatDuration } from './stats'
import type { SessionLike } from './types'

export type RecordId = 'longest-session' | 'most-pages-session' | 'best-day' | 'best-week' | 'best-month' | 'longest-streak'

export interface PersonalRecord {
  id: RecordId
  label: string
  value: number
  display: string
  /** When the record was set, for display. */
  when: string | null
}

/** Largest value in a map of period label -> value. */
function best(map: Map<string, number>): [string | null, number] {
  let key: string | null = null
  let max = 0
  for (const [k, v] of map) {
    if (v > max) {
      max = v
      key = k
    }
  }
  return [key, max]
}

function sumBy(sessions: SessionLike[], keyOf: (d: Date) => string, valueOf: (s: SessionLike) => number) {
  const map = new Map<string, number>()
  for (const s of sessions) {
    const k = keyOf(new Date(s.started_at))
    map.set(k, (map.get(k) ?? 0) + valueOf(s))
  }
  return map
}

/** Strava-style personal bests. A record with value 0 hasn't been set yet. */
export function computeRecords(sessions: SessionLike[], longestStreak: number): PersonalRecord[] {
  let longest: SessionLike | null = null
  let mostPages: SessionLike | null = null
  for (const s of sessions) {
    if (!longest || s.duration_seconds > longest.duration_seconds) longest = s
    if (!mostPages || s.pages_read > mostPages.pages_read) mostPages = s
  }
  const sessionDate = (s: SessionLike | null) => (s ? format(new Date(s.started_at), 'd MMM yyyy') : null)

  const [dayKey, daySecs] = best(secondsByDay(sessions))
  const [weekKey, weekSecs] = best(sumBy(sessions, (d) => format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd'), (s) => s.duration_seconds))
  const [monthKey, monthSecs] = best(sumBy(sessions, (d) => format(d, 'yyyy-MM'), (s) => s.duration_seconds))

  return [
    { id: 'longest-session', label: 'Longest session', value: longest?.duration_seconds ?? 0, display: formatDuration(longest?.duration_seconds ?? 0), when: sessionDate(longest) },
    { id: 'most-pages-session', label: 'Most pages in a session', value: mostPages?.pages_read ?? 0, display: `${mostPages?.pages_read ?? 0} pages`, when: sessionDate(mostPages) },
    { id: 'best-day', label: 'Best day', value: daySecs, display: formatDuration(daySecs), when: dayKey && format(new Date(dayKey + 'T00:00'), 'd MMM yyyy') },
    { id: 'best-week', label: 'Best week', value: weekSecs, display: formatDuration(weekSecs), when: weekKey && `Week of ${format(new Date(weekKey + 'T00:00'), 'd MMM yyyy')}` },
    { id: 'best-month', label: 'Best month', value: monthSecs, display: formatDuration(monthSecs), when: monthKey && format(new Date(monthKey + '-01T00:00'), 'MMMM yyyy') },
    { id: 'longest-streak', label: 'Longest streak', value: longestStreak, display: `${longestStreak} days`, when: null },
  ]
}

/**
 * Records beaten between two snapshots. A record only counts as "new" when there was
 * an earlier one to beat, so your very first session doesn't fire six records at once.
 */
export function newRecords(before: PersonalRecord[], after: PersonalRecord[]): PersonalRecord[] {
  return after.filter((a) => {
    const b = before.find((r) => r.id === a.id)
    return b != null && b.value > 0 && a.value > b.value
  })
}
