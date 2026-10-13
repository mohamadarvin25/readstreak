import { evaluateBadges, type BadgeIcon } from './badges'
import { computeRecords, newRecords } from './records'
import { computeStreak, dayKey, secondsByDay } from './streak'
import type { Book, SessionLike } from './types'

export interface Celebration {
  minutes: number
  pages: number
  streak: number
  /** This session grew the streak (e.g. first session of the day). */
  streakExtended: boolean
  /** This session pushed today over the daily goal. */
  goalMet: boolean
  freezeEarned: boolean
  bookFinished: string | null
  newBadges: { title: string; icon: BadgeIcon }[]
  newRecords: { label: string; display: string }[]
}

/** Everything worth cheering about after saving `session`, by comparing before and after. */
export function buildCelebration(args: {
  sessionsBefore: SessionLike[]
  session: SessionLike
  booksBefore: Pick<Book, 'status'>[]
  booksAfter: Pick<Book, 'status'>[]
  bookFinished?: string | null
  minMinutes: number
  goalMinutes: number
  today?: Date
}): Celebration {
  const { sessionsBefore, session, booksBefore, booksAfter, minMinutes, goalMinutes, today = new Date() } = args
  const sessionsAfter = [...sessionsBefore, session]

  const streakBefore = computeStreak(sessionsBefore, minMinutes, today)
  const streakAfter = computeStreak(sessionsAfter, minMinutes, today)

  const badgesBefore = evaluateBadges({ sessions: sessionsBefore, books: booksBefore, longestStreak: streakBefore.longest })
  const badgesAfter = evaluateBadges({ sessions: sessionsAfter, books: booksAfter, longestStreak: streakAfter.longest })
  const unlocked = badgesAfter.filter((b) => b.isEarned && !badgesBefore.find((x) => x.id === b.id)?.isEarned)

  const records = newRecords(computeRecords(sessionsBefore, streakBefore.longest), computeRecords(sessionsAfter, streakAfter.longest))

  const todayKey = dayKey(today)
  const goalSecs = goalMinutes * 60
  const todayBefore = secondsByDay(sessionsBefore).get(todayKey) ?? 0
  const todayAfter = secondsByDay(sessionsAfter).get(todayKey) ?? 0

  return {
    minutes: Math.round(session.duration_seconds / 60),
    pages: session.pages_read,
    streak: streakAfter.current,
    streakExtended: streakAfter.current > streakBefore.current,
    goalMet: todayBefore < goalSecs && todayAfter >= goalSecs,
    freezeEarned: streakAfter.freezes > streakBefore.freezes,
    bookFinished: args.bookFinished ?? null,
    newBadges: unlocked.map((b) => ({ title: b.title, icon: b.icon })),
    newRecords: records.map((r) => ({ label: r.label, display: r.display })),
  }
}
