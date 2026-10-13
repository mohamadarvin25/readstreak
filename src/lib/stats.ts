import { addWeeks, format, isSameMonth, startOfWeek, subWeeks } from 'date-fns'
import { secondsByDay } from './streak'
import type { Book, SessionLike } from './types'

/** Pages per hour, or null when there isn't enough data. */
export function pace(pages: number, seconds: number): number | null {
  if (pages <= 0 || seconds < 60) return null
  return Math.round((pages / seconds) * 3600)
}

export function totals(sessions: SessionLike[]) {
  let seconds = 0
  let pages = 0
  for (const s of sessions) {
    seconds += s.duration_seconds
    pages += s.pages_read
  }
  return { seconds, pages, count: sessions.length }
}

/** Minutes read in each of the last `weeks` weeks (weeks start Monday), oldest first. */
export function weeklyMinutes(sessions: SessionLike[], weeks = 12, today = new Date()) {
  const thisWeek = startOfWeek(today, { weekStartsOn: 1 })
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const start = subWeeks(thisWeek, weeks - 1 - i)
    return { start, end: addWeeks(start, 1), label: format(start, 'd MMM'), minutes: 0 }
  })
  for (const s of sessions) {
    const d = new Date(s.started_at)
    const bucket = buckets.find((b) => d >= b.start && d < b.end)
    if (bucket) bucket.minutes += s.duration_seconds / 60
  }
  return buckets.map((b) => ({ label: b.label, minutes: Math.round(b.minutes) }))
}

export function monthSummary(sessions: SessionLike[], books: Pick<Book, 'finished_at'>[], month = new Date()) {
  const inMonth = sessions.filter((s) => isSameMonth(new Date(s.started_at), month))
  const t = totals(inMonth)
  return {
    minutes: Math.round(t.seconds / 60),
    pages: t.pages,
    sessions: t.count,
    daysRead: secondsByDay(inMonth).size,
    booksFinished: books.filter((b) => b.finished_at && isSameMonth(new Date(b.finished_at), month)).length,
  }
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${Math.max(0, Math.round(seconds))}s`
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}
