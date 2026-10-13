import { describe, expect, it } from 'vitest'
import { evaluateBadges } from './badges'
import { elapsedMs } from './timer'
import { pace, weeklyMinutes } from './stats'

const earned = (ctx: Parameters<typeof evaluateBadges>[0]) =>
  evaluateBadges(ctx)
    .filter((b) => b.isEarned)
    .map((b) => b.id)

describe('badges', () => {
  it('earns nothing with no data', () => {
    expect(earned({ sessions: [], books: [], longestStreak: 0 })).toEqual([])
  })

  it('earns streak, page, hour and book badges', () => {
    const sessions = Array.from({ length: 10 }, () => ({
      started_at: new Date().toISOString(),
      duration_seconds: 3600,
      pages_read: 100,
    }))
    const ids = earned({ sessions, books: [{ status: 'finished' }, { status: 'reading' }], longestStreak: 7 })
    expect(ids).toEqual(['first-session', 'streak-3', 'streak-7', 'pages-1000', 'hours-10', 'book-1'])
  })
})

describe('timer', () => {
  it('excludes paused time', () => {
    const t = { bookId: null, startPage: null, startedAt: 0, pausedMs: 60_000, pausedAt: null }
    expect(elapsedMs(t, 300_000)).toBe(240_000)
  })

  it('freezes while paused', () => {
    const t = { bookId: null, startPage: null, startedAt: 0, pausedMs: 0, pausedAt: 100_000 }
    expect(elapsedMs(t, 900_000)).toBe(100_000)
  })
})

describe('stats', () => {
  it('computes pace in pages per hour', () => {
    expect(pace(30, 1800)).toBe(60)
    expect(pace(0, 1800)).toBeNull()
  })

  it('buckets minutes into weeks', () => {
    const today = new Date(2026, 9, 14) // Wednesday
    const weeks = weeklyMinutes(
      [
        { started_at: new Date(2026, 9, 12, 20).toISOString(), duration_seconds: 1200, pages_read: 0 },
        { started_at: new Date(2026, 9, 11, 20).toISOString(), duration_seconds: 600, pages_read: 0 },
      ],
      2,
      today,
    )
    expect(weeks.map((w) => w.minutes)).toEqual([10, 20])
  })
})
