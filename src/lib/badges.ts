import type { Book, SessionLike } from './types'
import { totals } from './stats'

export type BadgeIcon = 'spark' | 'flame' | 'book' | 'clock' | 'trophy'

export interface BadgeContext {
  sessions: SessionLike[]
  books: Pick<Book, 'status'>[]
  longestStreak: number
}

export interface Badge {
  id: string
  title: string
  description: string
  icon: BadgeIcon
  earned: (ctx: BadgeContext) => boolean
}

const finished = (ctx: BadgeContext) => ctx.books.filter((b) => b.status === 'finished').length

export const BADGES: Badge[] = [
  { id: 'first-session', title: 'First Page', description: 'Log your first session', icon: 'spark', earned: (c) => c.sessions.length >= 1 },
  { id: 'streak-3', title: 'Warming Up', description: '3-day streak', icon: 'flame', earned: (c) => c.longestStreak >= 3 },
  { id: 'streak-7', title: 'One Week Strong', description: '7-day streak', icon: 'flame', earned: (c) => c.longestStreak >= 7 },
  { id: 'streak-30', title: 'Habit Formed', description: '30-day streak', icon: 'flame', earned: (c) => c.longestStreak >= 30 },
  { id: 'streak-100', title: 'Unbreakable', description: '100-day streak', icon: 'flame', earned: (c) => c.longestStreak >= 100 },
  { id: 'pages-1000', title: 'Thousand Pages', description: 'Read 1,000 pages', icon: 'book', earned: (c) => totals(c.sessions).pages >= 1000 },
  { id: 'hours-10', title: 'Ten Hours In', description: '10 hours of reading', icon: 'clock', earned: (c) => totals(c.sessions).seconds >= 10 * 3600 },
  { id: 'hours-100', title: 'Deep Reader', description: '100 hours of reading', icon: 'clock', earned: (c) => totals(c.sessions).seconds >= 100 * 3600 },
  { id: 'book-1', title: 'The End', description: 'Finish your first book', icon: 'trophy', earned: (c) => finished(c) >= 1 },
  { id: 'book-5', title: 'Bookshelf', description: 'Finish 5 books', icon: 'trophy', earned: (c) => finished(c) >= 5 },
  { id: 'book-12', title: 'A Book a Month', description: 'Finish 12 books', icon: 'trophy', earned: (c) => finished(c) >= 12 },
]

export function evaluateBadges(ctx: BadgeContext) {
  return BADGES.map((b) => ({ ...b, isEarned: b.earned(ctx) }))
}
