// Decides who gets a reading reminder and what it says. Pure, so it is unit-tested.
import type { StreakResult } from './streak-core.ts'

/** Reminders go out up to this long after the chosen time (covers cron delays). */
export const REMINDER_WINDOW_MINUTES = 120

/** "20:00" or "20:00:00" -> minutes since midnight. */
export function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function isDue(args: { reminderTime: string; localMinutes: number; todayKey: string; lastRemindedOn: string | null }): boolean {
  if (args.lastRemindedOn === args.todayKey) return false
  const since = args.localMinutes - parseTime(args.reminderTime)
  return since >= 0 && since < REMINDER_WINDOW_MINUTES
}

export interface ReminderMessage {
  title: string
  body: string
  url: string
}

export function reminderMessage(streak: StreakResult, profile: { min_minutes: number; intention: string | null }): ReminderMessage {
  const nudge = profile.intention?.trim() || `Even ${profile.min_minutes} minutes keeps it alive.`
  if (streak.frozeYesterday) {
    return { title: `🧊 A freeze saved your ${streak.current}-day streak`, body: `Don't need another one. ${nudge}`, url: '/record' }
  }
  if (streak.current > 0) {
    return { title: `🔥 Don't break your ${streak.current}-day streak`, body: nudge, url: '/record' }
  }
  return { title: '📖 Time to read', body: `Just ${profile.min_minutes} minutes today starts a new streak.`, url: '/record' }
}
